-- ThePetGrid Sprint 5.4 — Pet Gift Center

create table if not exists public.pet_gifts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  gift_code text not null,
  gift_emoji text not null,
  gift_name text not null,
  message text not null default '',
  is_demo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint pet_gifts_code_check check (gift_code in ('bone','food','toy','heart','flowers','candle')),
  constraint pet_gifts_message_check check (char_length(message) <= 280)
);

create index if not exists pet_gifts_pet_id_created_at_idx
  on public.pet_gifts (pet_id, created_at desc);
create index if not exists pet_gifts_sender_id_idx
  on public.pet_gifts (sender_id);

alter table public.pet_gifts enable row level security;

drop policy if exists "Pet gifts are publicly readable" on public.pet_gifts;
create policy "Pet gifts are publicly readable"
  on public.pet_gifts for select
  using (true);

drop policy if exists "Authenticated users can send pet gifts" on public.pet_gifts;
create policy "Authenticated users can send pet gifts"
  on public.pet_gifts for insert
  to authenticated
  with check (auth.uid() = sender_id);

drop policy if exists "Senders can delete their own pet gifts" on public.pet_gifts;
create policy "Senders can delete their own pet gifts"
  on public.pet_gifts for delete
  to authenticated
  using (auth.uid() = sender_id);

alter publication supabase_realtime add table public.pet_gifts;
notify pgrst, 'reload schema';
