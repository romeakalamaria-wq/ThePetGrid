-- ThePetGrid Sprint 10.4 — Safe Pet Gifts + owner notifications
-- Run this whole file once in Supabase SQL Editor.

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
create index if not exists pet_gifts_sender_pet_created_at_idx
  on public.pet_gifts (sender_id, pet_id, created_at desc);

alter table public.pet_gifts enable row level security;

drop policy if exists "Pet gifts are publicly readable" on public.pet_gifts;
create policy "Pet gifts are publicly readable"
  on public.pet_gifts for select using (true);

-- Inserts now go through send_pet_gift(), which enforces ownership and cooldown.
drop policy if exists "Authenticated users can send pet gifts" on public.pet_gifts;

drop policy if exists "Senders can delete their own pet gifts" on public.pet_gifts;
create policy "Senders can delete their own pet gifts"
  on public.pet_gifts for delete to authenticated
  using (auth.uid() = sender_id);

create or replace function public.send_pet_gift(
  p_pet_id uuid,
  p_gift_code text,
  p_message text default ''
)
returns public.pet_gifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_owner_id uuid;
  v_pet_name text;
  v_pet_image text;
  v_is_memorial boolean;
  v_gift_emoji text;
  v_gift_name text;
  v_message text := trim(coalesce(p_message, ''));
  v_result public.pet_gifts;
begin
  if v_sender_id is null then
    raise exception 'You must be logged in to send a gift.' using errcode = '42501';
  end if;

  -- Lock this pet row so two simultaneous requests cannot bypass the cooldown.
  select owner_id, name, image_url, is_memorial
    into v_owner_id, v_pet_name, v_pet_image, v_is_memorial
  from public.pets
  where id = p_pet_id
  for update;

  if v_owner_id is null then
    raise exception 'Pet not found.' using errcode = 'P0002';
  end if;
  if v_owner_id = v_sender_id then
    raise exception 'You cannot send a gift to your own pet.' using errcode = 'P0001';
  end if;
  if v_is_memorial then
    raise exception 'Memorial pets receive flowers and candles through their Memorial page.' using errcode = 'P0001';
  end if;
  if char_length(v_message) > 280 then
    raise exception 'Gift messages can contain up to 280 characters.' using errcode = '22001';
  end if;

  select gift.emoji, gift.name
    into v_gift_emoji, v_gift_name
  from (values
    ('bone', '🦴', 'Bone'),
    ('food', '🥫', 'Pet Food'),
    ('toy', '🧸', 'Toy'),
    ('heart', '❤️', 'Heart')
  ) as gift(code, emoji, name)
  where gift.code = lower(trim(p_gift_code));

  if v_gift_name is null then
    raise exception 'This gift is not available.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.pet_gifts
    where sender_id = v_sender_id
      and pet_id = p_pet_id
      and created_at > now() - interval '24 hours'
  ) then
    raise exception 'You can send one gift to this pet every 24 hours.' using errcode = 'P0001';
  end if;

  insert into public.pet_gifts (
    sender_id, pet_id, gift_code, gift_emoji, gift_name, message, is_demo
  ) values (
    v_sender_id, p_pet_id, lower(trim(p_gift_code)), v_gift_emoji,
    v_gift_name, v_message, true
  ) returning * into v_result;

  insert into public.notifications (user_id, actor_id, type, entity_id, payload)
  values (
    v_owner_id,
    v_sender_id,
    'pet_gift_received',
    p_pet_id,
    jsonb_build_object(
      'pet_id', p_pet_id,
      'pet_name', v_pet_name,
      'pet_image', v_pet_image,
      'gift_code', v_result.gift_code,
      'gift_emoji', v_result.gift_emoji,
      'gift_name', v_result.gift_name,
      'message', v_result.message,
      'gift_id', v_result.id
    )
  );

  return v_result;
end;
$$;

revoke insert on public.pet_gifts from anon, authenticated;
grant select on public.pet_gifts to anon, authenticated;
grant delete on public.pet_gifts to authenticated;
grant execute on function public.send_pet_gift(uuid, text, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.pet_gifts;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
