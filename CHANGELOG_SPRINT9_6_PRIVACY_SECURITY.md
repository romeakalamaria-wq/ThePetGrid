# Sprint 9.6 — Privacy & Minimum Security

- Removed phone and email from the public Lost & Found API response.
- Guests now load reports through `public_lost_pet_reports`.
- Signed-in members can use Call/Email contact actions.
- Reasserted owner-only insert, update and delete rules for lost reports.
- Revoked anonymous write access from sensitive core tables.

## Required Supabase step

Run `backend/supabase-sprint9-6-privacy-security.sql` once in the Supabase SQL Editor before testing the updated site.
