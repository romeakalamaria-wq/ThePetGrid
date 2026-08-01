-- ============================================================
-- THEPETGRID — SPRINT 9.6 PRIVACY & MINIMUM SECURITY
-- Run once in Supabase Dashboard -> SQL Editor.
-- Safe to run more than once.
-- ============================================================

-- Public Lost & Found data deliberately excludes phone and email.
create or replace view public.public_lost_pet_reports
with (security_barrier = true)
as
select
  id, reporter_id, pet_id, status, pet_name, pet_type, breed, age, gender,
  color, country, city, area, address, latitude, longitude, event_date,
  owner_name, reward, description, image_url, resolved, resolved_at,
  created_at, updated_at
from public.lost_pet_reports;

revoke all on public.lost_pet_reports from anon;
grant select on public.public_lost_pet_reports to anon, authenticated;
grant select, insert, update, delete on public.lost_pet_reports to authenticated;

drop policy if exists "Lost reports are publicly readable" on public.lost_pet_reports;
drop policy if exists "Signed-in members read lost reports" on public.lost_pet_reports;
create policy "Signed-in members read lost reports"
  on public.lost_pet_reports for select to authenticated
  using (true);

drop policy if exists "Reporters delete their lost reports" on public.lost_pet_reports;
create policy "Reporters delete their lost reports"
  on public.lost_pet_reports for delete to authenticated
  using (auth.uid() = reporter_id);

-- Reassert the ownership rules that protect creation and editing.
drop policy if exists "Users create their own lost reports" on public.lost_pet_reports;
create policy "Users create their own lost reports"
  on public.lost_pet_reports for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Reporters update their lost reports" on public.lost_pet_reports;
create policy "Reporters update their lost reports"
  on public.lost_pet_reports for update to authenticated
  using (auth.uid() = reporter_id)
  with check (auth.uid() = reporter_id);

-- Keep the browser API privileges explicit and minimal.
revoke insert, update, delete on public.profiles from anon;
revoke insert, update, delete on public.pets from anon;
revoke all on public.messages from anon;
revoke all on public.notifications from anon;
revoke insert, update, delete on public.lost_pet_sightings from anon;

