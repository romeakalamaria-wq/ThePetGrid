-- =============================================
-- THEPETGRID - SUPABASE PET FOLLOWS (IDEMPOTENT)
-- Run once in Supabase SQL Editor.
-- =============================================

create table if not exists public.pet_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

create index if not exists pet_follows_pet_id_idx
  on public.pet_follows(pet_id);

create index if not exists pet_follows_user_id_idx
  on public.pet_follows(user_id);

alter table public.pet_follows enable row level security;

drop policy if exists "Pet follows are publicly readable" on public.pet_follows;
create policy "Pet follows are publicly readable"
  on public.pet_follows
  for select
  using (true);

drop policy if exists "Users create their own pet follows" on public.pet_follows;
create policy "Users create their own pet follows"
  on public.pet_follows
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users remove their own pet follows" on public.pet_follows;
create policy "Users remove their own pet follows"
  on public.pet_follows
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.pet_follows to anon, authenticated;
grant insert, delete on public.pet_follows to authenticated;
