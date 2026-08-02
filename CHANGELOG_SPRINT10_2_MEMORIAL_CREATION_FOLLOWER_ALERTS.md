# Sprint 10.2 — Memorial Creation and Follower Alerts

## Added

- Owner-only `Create Memorial` action on cloud pet profiles.
- Confirmation form with dates, farewell message, story, visibility and follower notification preference.
- Safe Supabase RPC that verifies pet ownership before creating a memorial.
- Automatic `In Memory` pet status without deleting the original profile.
- Persistent `memorial_created` notifications for followers of the pet.
- Memorial notifications inside the existing global Notification Center.
- Direct links from follower notifications to the correct Memorial page.
- Public Memorial Garden data loading from Supabase with demo fallback.

## Setup

Run `backend/supabase-memorial-garden.sql` once in the Supabase SQL Editor before testing cloud Memorial creation.
