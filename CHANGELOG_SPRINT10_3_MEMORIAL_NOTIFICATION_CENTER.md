# Sprint 10.3 — Memorial Notification Center

## Added

- Persistent follower notifications when a public Memorial is created.
- Pet name and profile photo inside the Notification Center.
- Direct `Visit Memorial` action.
- Unread badge until the follower opens the notification.
- Mark-one and mark-all-as-read support.
- Browser notification with the correct Memorial title, image and destination.
- Database-level duplicate protection: one Memorial notification per follower.
- Automatic enrichment of earlier Memorial notifications with the pet photo.

## Supabase setup

Run `backend/supabase-memorial-garden.sql` once again in Supabase SQL Editor.
The script is idempotent and can safely be re-run.
