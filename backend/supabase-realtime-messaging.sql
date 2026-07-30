-- ThePetGrid Sprint 5 — Real-Time Messaging
-- Run in Supabase SQL Editor once.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_no_self_message check (sender_id <> recipient_id)
);

create index if not exists messages_sender_created_idx on public.messages(sender_id, created_at desc);
create index if not exists messages_recipient_created_idx on public.messages(recipient_id, created_at desc);
create index if not exists messages_pair_created_idx on public.messages(sender_id, recipient_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "Users read messages they participate in" on public.messages;
create policy "Users read messages they participate in"
  on public.messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users send messages as themselves" on public.messages;
create policy "Users send messages as themselves"
  on public.messages for insert to authenticated
  with check (auth.uid() = sender_id and sender_id <> recipient_id);

drop policy if exists "Recipients mark their messages as read" on public.messages;
create policy "Recipients mark their messages as read"
  on public.messages for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

grant select, insert, update on public.messages to authenticated;

-- Add the table to Supabase Realtime. Safe to run repeatedly.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
