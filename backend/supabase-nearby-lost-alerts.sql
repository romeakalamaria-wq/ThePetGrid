-- ============================================================
-- THEPETGRID — SPRINT 9.4 NEARBY LOST PET ALERTS
-- Run once in Supabase Dashboard -> SQL Editor.
-- Safe to run more than once.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.lost_pet_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  status text not null default 'lost' check (status in ('lost', 'found')),
  pet_name text not null,
  pet_type text,
  breed text,
  age text,
  gender text,
  color text,
  country text not null,
  city text not null,
  area text,
  address text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  event_date date not null,
  owner_name text,
  phone text,
  email text,
  reward text,
  description text,
  image_url text,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lost_pet_reports_active_idx
  on public.lost_pet_reports(status, resolved, created_at desc);
create index if not exists lost_pet_reports_location_idx
  on public.lost_pet_reports(latitude, longitude);

create table if not exists public.nearby_alert_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  radius_km integer not null default 10 check (radius_km in (5, 10, 25, 50)),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  browser_notifications boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.lost_pet_reports enable row level security;
alter table public.nearby_alert_preferences enable row level security;

drop policy if exists "Lost reports are publicly readable" on public.lost_pet_reports;
create policy "Lost reports are publicly readable"
  on public.lost_pet_reports for select using (true);

drop policy if exists "Users create their own lost reports" on public.lost_pet_reports;
create policy "Users create their own lost reports"
  on public.lost_pet_reports for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Reporters update their lost reports" on public.lost_pet_reports;
create policy "Reporters update their lost reports"
  on public.lost_pet_reports for update to authenticated
  using (auth.uid() = reporter_id)
  with check (auth.uid() = reporter_id);

drop policy if exists "Users read their nearby alert preferences" on public.nearby_alert_preferences;
create policy "Users read their nearby alert preferences"
  on public.nearby_alert_preferences for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users create their nearby alert preferences" on public.nearby_alert_preferences;
create policy "Users create their nearby alert preferences"
  on public.nearby_alert_preferences for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update their nearby alert preferences" on public.nearby_alert_preferences;
create policy "Users update their nearby alert preferences"
  on public.nearby_alert_preferences for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.lost_pet_reports to anon, authenticated;
grant insert, update on public.lost_pet_reports to authenticated;
grant select, insert, update on public.nearby_alert_preferences to authenticated;

create or replace function public.distance_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

create or replace function public.notify_nearby_lost_pet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'lost' or new.resolved then
    return new;
  end if;

  insert into public.notifications (user_id, actor_id, type, entity_id, payload)
  select
    preference.user_id,
    new.reporter_id,
    'nearby_lost_pet',
    new.id,
    jsonb_build_object(
      'report_id', new.id,
      'pet_name', new.pet_name,
      'pet_type', new.pet_type,
      'address', coalesce(new.address, concat_ws(', ', new.area, new.city, new.country)),
      'latitude', new.latitude,
      'longitude', new.longitude,
      'distance_km', round(public.distance_km(preference.latitude, preference.longitude, new.latitude, new.longitude)::numeric, 1)
    )
  from public.nearby_alert_preferences preference
  where preference.enabled
    and preference.latitude is not null
    and preference.longitude is not null
    and preference.user_id <> new.reporter_id
    and public.distance_km(preference.latitude, preference.longitude, new.latitude, new.longitude) <= preference.radius_km;

  return new;
end;
$$;

drop trigger if exists lost_pet_report_nearby_alerts on public.lost_pet_reports;
create trigger lost_pet_report_nearby_alerts
  after insert on public.lost_pet_reports
  for each row execute function public.notify_nearby_lost_pet();

drop trigger if exists lost_pet_reports_set_updated_at on public.lost_pet_reports;
create trigger lost_pet_reports_set_updated_at
  before update on public.lost_pet_reports
  for each row execute function public.set_updated_at();

create or replace function public.set_nearby_alert_preferences(
  p_enabled boolean,
  p_radius_km integer,
  p_latitude double precision,
  p_longitude double precision,
  p_browser_notifications boolean
)
returns public.nearby_alert_preferences
language plpgsql
security invoker
as $$
declare
  result public.nearby_alert_preferences;
begin
  insert into public.nearby_alert_preferences (
    user_id, enabled, radius_km, latitude, longitude, browser_notifications, updated_at
  ) values (
    auth.uid(), p_enabled, p_radius_km, p_latitude, p_longitude, p_browser_notifications, now()
  )
  on conflict (user_id) do update set
    enabled = excluded.enabled,
    radius_km = excluded.radius_km,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    browser_notifications = excluded.browser_notifications,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

grant execute on function public.set_nearby_alert_preferences(boolean, integer, double precision, double precision, boolean) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.lost_pet_reports;
exception
  when duplicate_object then null;
end $$;
