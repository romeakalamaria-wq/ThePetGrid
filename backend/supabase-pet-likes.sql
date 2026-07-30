-- =============================================
-- THEPETGRID - SUPABASE PET LIKES (IDEMPOTENT)
-- Run once in Supabase SQL Editor.
-- =============================================

create table if not exists public.pet_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

create index if not exists pet_likes_pet_id_idx
  on public.pet_likes(pet_id);

create index if not exists pet_likes_user_id_idx
  on public.pet_likes(user_id);

alter table public.pet_likes enable row level security;

drop policy if exists "Likes are publicly readable" on public.pet_likes;
create policy "Likes are publicly readable"
  on public.pet_likes
  for select
  using (true);

drop policy if exists "Users create their own likes" on public.pet_likes;
create policy "Users create their own likes"
  on public.pet_likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users remove their own likes" on public.pet_likes;
create policy "Users remove their own likes"
  on public.pet_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.pet_likes to anon, authenticated;
grant insert, delete on public.pet_likes to authenticated;
