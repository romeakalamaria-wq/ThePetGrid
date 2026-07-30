-- ThePetGrid Sprint 5.6 — Location Picker
-- Safe to run more than once in Supabase SQL Editor.

alter table public.pets
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.pets drop constraint if exists pets_latitude_check;
alter table public.pets add constraint pets_latitude_check
  check (latitude is null or latitude between -90 and 90);

alter table public.pets drop constraint if exists pets_longitude_check;
alter table public.pets add constraint pets_longitude_check
  check (longitude is null or longitude between -180 and 180);

create index if not exists pets_country_city_idx on public.pets(country, city);
