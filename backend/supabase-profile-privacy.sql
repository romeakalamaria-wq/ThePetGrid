-- ============================================================
-- THEPETGRID — SPRINT 10.5 PROFILE & PRIVACY
-- Run once in Supabase Dashboard -> SQL Editor.
-- Safe to run more than once.
-- ============================================================

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists is_private boolean not null default false;
alter table public.profiles add column if not exists show_location boolean not null default true;
alter table public.profiles add column if not exists message_privacy text not null default 'everyone';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_message_privacy_check'
  ) then
    alter table public.profiles
      add constraint profiles_message_privacy_check
      check (message_privacy in ('everyone', 'followers', 'nobody'));
  end if;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "Members update their own profile" on public.profiles;
create policy "Members update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select on public.profiles to anon, authenticated;
grant update (display_name, bio, country, city, is_private, show_location, message_privacy)
  on public.profiles to authenticated;
