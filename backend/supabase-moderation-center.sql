-- ============================================================
-- THEPETGRID — SPRINT 10.8 MODERATION CENTER
-- Run after backend/supabase-community-safety.sql.
-- Safe to run more than once.
-- ============================================================

create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

-- SECURITY DEFINER prevents users from reading the admin roster directly.
create or replace function public.is_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select check_user is not null and exists (
    select 1 from public.admin_users where user_id = check_user
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

alter table public.content_reports
  add column if not exists moderator_notes text not null default '',
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.content_reports drop constraint if exists content_reports_moderator_notes_length;
alter table public.content_reports add constraint content_reports_moderator_notes_length check (char_length(moderator_notes) <= 2000);

create index if not exists content_reports_review_queue_idx
  on public.content_reports(status, reason, created_at desc);

-- Replace report policies with member + admin aware policies.
drop policy if exists "Members read their reports" on public.content_reports;
drop policy if exists "Members create reports" on public.content_reports;
drop policy if exists "Admins read all reports" on public.content_reports;
drop policy if exists "Admins update reports" on public.content_reports;

create policy "Members and admins read reports" on public.content_reports
  for select to authenticated
  using (auth.uid() = reporter_id or public.is_admin());

create policy "Members create reports" on public.content_reports
  for insert to authenticated
  with check (
    auth.uid() = reporter_id
    and status = 'open'
    and moderator_notes = ''
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "Admins update reports" on public.content_reports
  for update to authenticated
  using (public.is_admin())
  with check (
    public.is_admin()
    and status in ('open', 'reviewing', 'resolved', 'dismissed')
    and (reviewed_by is null or reviewed_by = auth.uid())
  );

grant select, insert, update on public.content_reports to authenticated;

-- Optional audit-friendly trigger: every admin update records the acting admin.
create or replace function public.set_report_review_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  return new;
end;
$$;

revoke all on function public.set_report_review_metadata() from public;

drop trigger if exists content_reports_set_review_metadata on public.content_reports;
create trigger content_reports_set_review_metadata
before update of status, moderator_notes on public.content_reports
for each row execute function public.set_report_review_metadata();

-- ============================================================
-- FIRST ADMIN — RUN ONCE AFTER REPLACING THE EMAIL
-- ============================================================
-- insert into public.admin_users (user_id)
-- select id from auth.users where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com')
-- on conflict (user_id) do nothing;
--
-- Verify:
-- select p.username, p.display_name, a.created_at
-- from public.admin_users a join public.profiles p on p.id = a.user_id;
