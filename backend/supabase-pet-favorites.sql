-- =============================================
-- THEPETGRID - SUPABASE PET FAVORITES
-- Safe to run more than once
-- =============================================

create table if not exists public.pet_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

alter table public.pet_favorites enable row level security;

drop policy if exists "Users read their own favorites" on public.pet_favorites;
drop policy if exists "Users create their own favorites" on public.pet_favorites;
drop policy if exists "Users remove their own favorites" on public.pet_favorites;

create policy "Users read their own favorites"
  on public.pet_favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users create their own favorites"
  on public.pet_favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users remove their own favorites"
  on public.pet_favorites for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.pet_favorites to authenticated;
