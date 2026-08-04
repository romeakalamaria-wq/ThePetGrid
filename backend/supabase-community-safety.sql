-- ============================================================
-- THEPETGRID — SPRINT 10.7 COMMUNITY SAFETY & TRUST
-- Run once in Supabase SQL Editor. Safe to run more than once.
-- ============================================================

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  content_type text not null check (content_type in ('user', 'post', 'comment', 'message')),
  content_id text not null,
  reason text not null check (reason in ('spam', 'harassment', 'scam', 'unsafe', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, content_type, content_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
create index if not exists content_reports_status_idx on public.content_reports(status, created_at desc);

alter table public.user_blocks enable row level security;
alter table public.content_reports enable row level security;

drop policy if exists "Members read their blocks" on public.user_blocks;
create policy "Members read their blocks" on public.user_blocks
  for select to authenticated using (auth.uid() = blocker_id);

drop policy if exists "Members create their blocks" on public.user_blocks;
create policy "Members create their blocks" on public.user_blocks
  for insert to authenticated with check (auth.uid() = blocker_id);

drop policy if exists "Members remove their blocks" on public.user_blocks;
create policy "Members remove their blocks" on public.user_blocks
  for delete to authenticated using (auth.uid() = blocker_id);

drop policy if exists "Members read their reports" on public.content_reports;
create policy "Members read their reports" on public.content_reports
  for select to authenticated using (auth.uid() = reporter_id);

drop policy if exists "Members create reports" on public.content_reports;
create policy "Members create reports" on public.content_reports
  for insert to authenticated with check (auth.uid() = reporter_id);

revoke all on public.user_blocks, public.content_reports from anon;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert on public.content_reports to authenticated;

-- Enforce blocking at the database layer as well as in the interface.
create or replace function public.users_are_blocked(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = first_user and blocked_id = second_user)
       or (blocker_id = second_user and blocked_id = first_user)
  );
$$;

revoke all on function public.users_are_blocked(uuid, uuid) from public;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

drop policy if exists "Users read messages they participate in" on public.messages;
create policy "Users read messages they participate in" on public.messages
  for select to authenticated
  using (
    (auth.uid() = sender_id or auth.uid() = recipient_id)
    and not public.users_are_blocked(sender_id, recipient_id)
  );

drop policy if exists "Users send messages as themselves" on public.messages;
create policy "Users send messages as themselves" on public.messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> recipient_id
    and not public.users_are_blocked(sender_id, recipient_id)
  );

drop policy if exists "Recipients mark their messages as read" on public.messages;
create policy "Recipients mark their messages as read" on public.messages
  for update to authenticated
  using (
    auth.uid() = recipient_id
    and not public.users_are_blocked(sender_id, recipient_id)
  )
  with check (auth.uid() = recipient_id);
