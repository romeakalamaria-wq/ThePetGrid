-- ============================================================
-- THEPETGRID — SUPABASE FOUNDATION v1
-- Run once in Supabase Dashboard → SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- --------------------------
-- PROFILES
-- --------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  bio text default '',
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

-- Automatically create a profile after Auth registration.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1), 'Member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------
-- PETS
-- --------------------------
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null,
  breed text,
  age numeric(5,2),
  gender text,
  country text,
  city text,
  bio text default '',
  image_url text,
  verified boolean not null default false,
  is_memorial boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists pets_created_at_idx on public.pets(created_at desc);

-- --------------------------
-- LIKES / FAVORITES / FOLLOWS
-- --------------------------
create table if not exists public.pet_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

create table if not exists public.pet_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_no_self_follow check (follower_id <> following_id)
);

-- --------------------------
-- MESSAGES / NOTIFICATIONS
-- --------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_sender_idx on public.messages(sender_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications(user_id, created_at desc);

-- --------------------------
-- UPDATED_AT TRIGGER
-- --------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists pets_set_updated_at on public.pets;
create trigger pets_set_updated_at
  before update on public.pets
  for each row execute procedure public.set_updated_at();

-- --------------------------
-- ROW LEVEL SECURITY
-- --------------------------
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.pet_likes enable row level security;
alter table public.pet_favorites enable row level security;
alter table public.profile_follows enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Profiles
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Pets
create policy "Pets are publicly readable"
  on public.pets for select
  using (true);

create policy "Authenticated users create their own pets"
  on public.pets for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owners update their pets"
  on public.pets for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners delete their pets"
  on public.pets for delete
  to authenticated
  using (auth.uid() = owner_id);

-- Likes
create policy "Likes are publicly readable"
  on public.pet_likes for select using (true);
create policy "Users create their own likes"
  on public.pet_likes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users remove their own likes"
  on public.pet_likes for delete to authenticated
  using (auth.uid() = user_id);

-- Favorites
create policy "Users read their own favorites"
  on public.pet_favorites for select to authenticated
  using (auth.uid() = user_id);
create policy "Users create their own favorites"
  on public.pet_favorites for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users remove their own favorites"
  on public.pet_favorites for delete to authenticated
  using (auth.uid() = user_id);

-- Follows
create policy "Follows are publicly readable"
  on public.profile_follows for select using (true);
create policy "Users create their own follows"
  on public.profile_follows for insert to authenticated
  with check (auth.uid() = follower_id);
create policy "Users remove their own follows"
  on public.profile_follows for delete to authenticated
  using (auth.uid() = follower_id);

-- Messages
create policy "Users read messages they participate in"
  on public.messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users send messages as themselves"
  on public.messages for insert to authenticated
  with check (auth.uid() = sender_id);
create policy "Recipients mark their messages as read"
  on public.messages for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- Notifications
create policy "Users read their notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);
create policy "Users update their notifications"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Explicit grants for browser Data API access.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.pets, public.pet_likes, public.profile_follows to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.pets, public.pet_likes,
  public.pet_favorites, public.profile_follows, public.messages, public.notifications to authenticated;
