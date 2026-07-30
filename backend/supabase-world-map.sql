-- ThePetGrid Sprint 5.5.1 — World Map Compatibility Fix
-- Run this file once in Supabase SQL Editor.
-- It is safe to run more than once.

-- Add every column required by the map, even on older projects.
alter table public.pets
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists image_url text,
  add column if not exists verified boolean not null default false,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists created_at timestamptz not null default now();

-- Existing legacy pets did not store a location. Give them a visible,
-- editable country fallback so they appear on the map immediately.
-- Change Greece below before running if your existing pets belong elsewhere.
update public.pets
set country = 'Greece'
where country is null or btrim(country) = '';

-- Normalize blank city values to NULL.
update public.pets
set city = null
where city is not null and btrim(city) = '';

-- Keep coordinates valid when exact coordinates are added later.
alter table public.pets drop constraint if exists pets_latitude_check;
alter table public.pets add constraint pets_latitude_check
  check (latitude is null or latitude between -90 and 90);

alter table public.pets drop constraint if exists pets_longitude_check;
alter table public.pets add constraint pets_longitude_check
  check (longitude is null or longitude between -180 and 180);

create index if not exists pets_country_city_idx
  on public.pets(country, city);

create index if not exists pets_created_at_idx
  on public.pets(created_at desc);

comment on column public.pets.latitude is
  'Optional exact map latitude. When empty, the map uses city/country fallback coordinates.';
comment on column public.pets.longitude is
  'Optional exact map longitude. When empty, the map uses city/country fallback coordinates.';
