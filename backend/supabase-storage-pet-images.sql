-- =====================================================
-- THEPETGRID — PUBLIC PET IMAGE STORAGE
-- Run once in Supabase Dashboard -> SQL Editor
-- Safe to run again.
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-images',
  'pet-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view pet images" on storage.objects;
create policy "Public can view pet images"
on storage.objects for select
to public
using (bucket_id = 'pet-images');

drop policy if exists "Users upload pet images to own folder" on storage.objects;
create policy "Users upload pet images to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update pet images in own folder" on storage.objects;
create policy "Users update pet images in own folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'pet-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'pet-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete pet images from own folder" on storage.objects;
create policy "Users delete pet images from own folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'pet-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
