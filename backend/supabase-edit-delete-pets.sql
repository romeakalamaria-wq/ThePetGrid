-- =====================================================
-- THEPETGRID — EDIT & DELETE PETS
-- Run in Supabase Dashboard -> SQL Editor.
-- Safe to run more than once.
-- =====================================================

alter table public.pets enable row level security;

drop policy if exists "Owners update their pets" on public.pets;
create policy "Owners update their pets"
on public.pets for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners delete their pets" on public.pets;
create policy "Owners delete their pets"
on public.pets for delete
to authenticated
using (auth.uid() = owner_id);

-- Storage permissions for replacing/deleting pet photos.
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
