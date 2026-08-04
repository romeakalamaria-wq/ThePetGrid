# Sprint 10.8 — Moderation Center

## Added
- `pages/admin-moderation.html`: protected admin-only moderation dashboard.
- `css/admin-moderation.css`: responsive premium admin interface.
- `js/admin-moderation.js`: admin verification, report queue, counters, filters, search, sorting and decisions.
- `backend/supabase-moderation-center.sql`: secure admin registry, `is_admin()` RPC, admin RLS policies, moderator notes and audit metadata.

## Security model
- The browser checks `is_admin()` before revealing the dashboard.
- Supabase RLS remains the real security boundary: non-admin users cannot read the global queue or update reports.
- The admin roster is not directly readable by authenticated members.
- Every decision records `reviewed_by` and `reviewed_at` through a database trigger.

## Setup
1. Run `backend/supabase-community-safety.sql` if Sprint 10.7 SQL has not already been applied.
2. Run `backend/supabase-moderation-center.sql` in Supabase SQL Editor.
3. At the bottom of that SQL file, replace `YOUR-ADMIN-EMAIL@example.com` and run the commented first-admin INSERT separately.
4. Deploy the full project and open `pages/admin-moderation.html` while logged in with the approved admin account.

## Features
- Counters: open, reviewing, resolved, dismissed and total.
- Filters: text search, status, content type, reason and sort order.
- Report review modal with moderator notes.
- Status transitions: open, reviewing, resolved and dismissed.
- High-priority visual treatment for unsafe, scam and harassment reports.
