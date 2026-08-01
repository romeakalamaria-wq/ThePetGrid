-- THEPETGRID — SPRINT 9.5 LOST PET SIGHTINGS
-- Run once in Supabase Dashboard -> SQL Editor.

create table if not exists public.lost_pet_sightings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.lost_pet_reports(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  address text,
  note text not null check (char_length(note) between 3 and 600),
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists lost_pet_sightings_report_idx on public.lost_pet_sightings(report_id, observed_at desc);
alter table public.lost_pet_sightings enable row level security;

drop policy if exists "Sightings are publicly readable" on public.lost_pet_sightings;
create policy "Sightings are publicly readable" on public.lost_pet_sightings for select using (true);
drop policy if exists "Members create their own sightings" on public.lost_pet_sightings;
create policy "Members create their own sightings" on public.lost_pet_sightings for insert to authenticated with check (auth.uid() = reporter_id);

grant select on public.lost_pet_sightings to anon, authenticated;
grant insert on public.lost_pet_sightings to authenticated;

create or replace function public.notify_lost_pet_sighting()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_user uuid; pet_label text;
begin
  select reporter_id, pet_name into target_user, pet_label from public.lost_pet_reports where id = new.report_id and not resolved;
  if target_user is null or target_user = new.reporter_id then return new; end if;
  insert into public.notifications(user_id, actor_id, type, entity_id, payload)
  values(target_user, new.reporter_id, 'lost_pet_sighting', new.report_id,
    jsonb_build_object('report_id',new.report_id,'sighting_id',new.id,'pet_name',pet_label,'address',new.address,'latitude',new.latitude,'longitude',new.longitude,'observed_at',new.observed_at,'note',new.note));
  return new;
end;
$$;

drop trigger if exists lost_pet_sighting_notification on public.lost_pet_sightings;
create trigger lost_pet_sighting_notification after insert on public.lost_pet_sightings for each row execute function public.notify_lost_pet_sighting();

do $$ begin alter publication supabase_realtime add table public.lost_pet_sightings; exception when duplicate_object then null; end $$;
