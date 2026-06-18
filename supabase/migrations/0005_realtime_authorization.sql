-- 0005: gate the realtime channels behind room membership.
--
-- The Yjs update stream (topic `room:<id>`) and the cursor/roster presence channel
-- (topic `presence:<id>`) were public: Postgres RLS protects the snapshot/update TABLES,
-- but Supabase Realtime broadcast/presence is a separate plane that RLS doesn't cover.
-- Result before this migration: a kicked or never-approved user who knows the room id can
-- still receive every live edit and harvest the member roster over the socket.
--
-- The client now opens these channels with `config: { private: true }`, which makes Realtime
-- enforce RLS on `realtime.messages`. These policies allow a member to receive (SELECT) and
-- send (INSERT) only on their own rooms' topics; everything else is denied by default.
--
-- DEPLOY ORDER: apply this together with the frontend change that sets `private: true`.
-- A private channel with no matching policy fails to subscribe, so the two must ship as one.

-- Map a realtime topic ("room:<uuid>" / "presence:<uuid>") to a membership check.
-- Anything that isn't one of our room topics — or carries a malformed id — is denied.
create or replace function public.can_access_room_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if p_topic like 'room:%' then
    v_id := substring(p_topic from 6);
  elsif p_topic like 'presence:%' then
    v_id := substring(p_topic from 10);
  else
    return false;
  end if;

  -- Guard the uuid cast so a bogus topic returns false instead of raising.
  if v_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;

  return is_room_member(v_id::uuid);
end;
$$;

alter table realtime.messages enable row level security;

-- Receiving (broadcast in, presence sync/join/leave).
drop policy if exists room_members_read_realtime on realtime.messages;
create policy room_members_read_realtime on realtime.messages
  for select to authenticated
  using (public.can_access_room_topic((select realtime.topic())));

-- Sending (broadcast out, presence track).
drop policy if exists room_members_write_realtime on realtime.messages;
create policy room_members_write_realtime on realtime.messages
  for insert to authenticated
  with check (public.can_access_room_topic((select realtime.topic())));
