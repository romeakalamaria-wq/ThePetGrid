-- ThePetGrid Sprint 5.3 — Rich Messaging
-- Run once in Supabase SQL Editor.

alter table public.messages add column if not exists message_type text not null default 'text';
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_type text;
alter table public.messages add column if not exists attachment_size bigint;
alter table public.messages add column if not exists gift_code text;
alter table public.messages add column if not exists gift_emoji text;
alter table public.messages add column if not exists gift_name text;

alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check
check (message_type in ('text','attachment','gift'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  true,
  10485760,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip','application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files are stored under: <user-id>/<random-name>
drop policy if exists "message attachments public read" on storage.objects;
create policy "message attachments public read"
on storage.objects for select
using (bucket_id = 'message-attachments');

drop policy if exists "users upload own message attachments" on storage.objects;
create policy "users upload own message attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own message attachments" on storage.objects;
create policy "users delete own message attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Ensure Realtime publishes the expanded message rows.
alter table public.messages replica identity full;
