-- ============================================================
-- THEPETGRID — ORGANIZATIONS MODULE v1
-- Run after supabase-schema.sql
-- ============================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null,
  type text not null default 'other'
    check (type in ('rescue','shelter','animal_welfare','sanctuary','other')),
  description text not null default '',
  logo_url text,
  cover_url text,
  website text,
  email text,
  phone text,
  country text,
  city text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organizations_slug_lower_unique
  on public.organizations (lower(slug));

create index if not exists organizations_country_idx
  on public.organizations(country);
create index if not exists organizations_type_idx
  on public.organizations(type);
create index if not exists organizations_verified_idx
  on public.organizations(verified desc, name);

-- People who manage an organization.
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner','admin','editor','member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Connect existing pets to an organization without changing the pets table.
create table if not exists public.organization_pets (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  adoption_status text not null default 'not_listed'
    check (adoption_status in ('not_listed','available','pending','adopted')),
  created_at timestamptz not null default now(),
  primary key (organization_id, pet_id)
);

-- Organization followers are separate from personal profile follows.
create table if not exists public.organization_follows (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members(user_id);
create index if not exists organization_pets_pet_idx
  on public.organization_pets(pet_id);
create index if not exists organization_follows_user_idx
  on public.organization_follows(user_id);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute procedure public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_pets enable row level security;
alter table public.organization_follows enable row level security;

-- Public directory/profile.
create policy "Organizations are publicly readable"
  on public.organizations for select
  using (true);

-- Owners/admins can manage their organization.
create policy "Authenticated users create organizations"
  on public.organizations for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Organization owners update organizations"
  on public.organizations for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Organization owners delete organizations"
  on public.organizations for delete
  to authenticated
  using (auth.uid() = owner_id);

create policy "Organization memberships are publicly readable"
  on public.organization_members for select
  using (true);

create policy "Organization owners manage memberships"
  on public.organization_members for all
  to authenticated
  using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_id = auth.uid()
    )
  );

create policy "Organization pets are publicly readable"
  on public.organization_pets for select
  using (true);

create policy "Organization owners manage organization pets"
  on public.organization_pets for all
  to authenticated
  using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_id = auth.uid()
    )
  );

create policy "Organization follows are publicly readable"
  on public.organization_follows for select
  using (true);

create policy "Users follow organizations as themselves"
  on public.organization_follows for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users unfollow organizations as themselves"
  on public.organization_follows for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.organizations, public.organization_members,
  public.organization_pets, public.organization_follows
  to anon, authenticated;

grant insert, update, delete on public.organizations,
  public.organization_members, public.organization_pets,
  public.organization_follows
  to authenticated;
