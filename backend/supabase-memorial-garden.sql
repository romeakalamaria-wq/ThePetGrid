-- ============================================================
-- THEPETGRID — SPRINT 10.2 MEMORIAL GARDEN
-- Run once in Supabase Dashboard -> SQL Editor.
-- Safe to run more than once.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.pet_memorials (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references public.pets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  birth_date date,
  passed_date date not null,
  farewell_message text not null check (char_length(farewell_message) between 1 and 1200),
  story text,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  notify_followers boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memorial_tributes (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.pet_memorials(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tribute_type text not null check (tribute_type in ('candle', 'flower', 'memory')),
  message text check (message is null or char_length(message) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists pet_memorials_owner_idx on public.pet_memorials(owner_id, created_at desc);
create index if not exists memorial_tributes_memorial_idx on public.memorial_tributes(memorial_id, created_at desc);

alter table public.pet_memorials enable row level security;
alter table public.memorial_tributes enable row level security;

drop policy if exists "Public memorials are readable" on public.pet_memorials;
create policy "Public memorials are readable" on public.pet_memorials
  for select using (visibility = 'public' or auth.uid() = owner_id);

drop policy if exists "Owners update their memorials" on public.pet_memorials;
create policy "Owners update their memorials" on public.pet_memorials
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Owners delete their memorials" on public.pet_memorials;
create policy "Owners delete their memorials" on public.pet_memorials
  for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Memorial tributes are publicly readable" on public.memorial_tributes;
create policy "Memorial tributes are publicly readable" on public.memorial_tributes
  for select using (true);

drop policy if exists "Members create their own memorial tributes" on public.memorial_tributes;
create policy "Members create their own memorial tributes" on public.memorial_tributes
  for insert to authenticated with check (auth.uid() = user_id);

grant select on public.pet_memorials to anon, authenticated;
grant update, delete on public.pet_memorials to authenticated;
grant select on public.memorial_tributes to anon, authenticated;
grant insert on public.memorial_tributes to authenticated;

create or replace function public.create_pet_memorial(
  p_pet_id uuid,
  p_birth_date date,
  p_passed_date date,
  p_farewell_message text,
  p_story text,
  p_visibility text,
  p_notify_followers boolean
)
returns public.pet_memorials
language plpgsql
security definer
set search_path = public
as $$
declare
  current_owner uuid;
  pet_name text;
  result public.pet_memorials;
begin
  select owner_id, name into current_owner, pet_name from public.pets where id = p_pet_id;
  if current_owner is null or current_owner <> auth.uid() then
    raise exception 'Only the pet owner can create this memorial.';
  end if;
  if p_passed_date is null or nullif(trim(p_farewell_message), '') is null then
    raise exception 'Date of passing and farewell message are required.';
  end if;

  insert into public.pet_memorials (pet_id, owner_id, birth_date, passed_date, farewell_message, story, visibility, notify_followers)
  values (p_pet_id, auth.uid(), p_birth_date, p_passed_date, trim(p_farewell_message), nullif(trim(p_story), ''), coalesce(p_visibility, 'public'), coalesce(p_notify_followers, true))
  on conflict (pet_id) do update set
    birth_date = excluded.birth_date,
    passed_date = excluded.passed_date,
    farewell_message = excluded.farewell_message,
    story = excluded.story,
    visibility = excluded.visibility,
    notify_followers = excluded.notify_followers,
    updated_at = now()
  returning * into result;

  update public.pets set is_memorial = true, updated_at = now() where id = p_pet_id;

  if result.notify_followers and result.visibility = 'public' then
    insert into public.notifications (user_id, actor_id, type, entity_id, payload)
    select
      follow.user_id,
      auth.uid(),
      'memorial_created',
      result.id,
      jsonb_build_object('memorial_id', result.id, 'pet_id', p_pet_id, 'pet_name', pet_name)
    from public.pet_follows follow
    where follow.pet_id = p_pet_id and follow.user_id <> auth.uid()
      and not exists (
        select 1 from public.notifications n
        where n.user_id = follow.user_id and n.type = 'memorial_created' and n.entity_id = result.id
      );
  end if;

  return result;
end;
$$;

grant execute on function public.create_pet_memorial(uuid,date,date,text,text,text,boolean) to authenticated;

drop trigger if exists pet_memorials_set_updated_at on public.pet_memorials;
create trigger pet_memorials_set_updated_at before update on public.pet_memorials
  for each row execute function public.set_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.pet_memorials;
exception when duplicate_object then null;
end $$;

