-- 0004: atomic access-request approval.
--
-- Collapses the three sequential round-trips approveRequest() used to make
-- (select status -> upsert member -> update status) into one SECURITY DEFINER
-- call, and closes the TOCTOU window between the pending-check and the status
-- update by taking a row lock. Authorization is the explicit is_room_owner()
-- check (the definer context bypasses RLS), mirroring join_room_with_token.
--
-- Returns one of:
--   'approved'  -> caller is owner; member added (or already present) and request approved
--   'not_found' -> no request row for (room, user)
--   'handled'   -> request was already approved or denied
--   'forbidden' -> caller is not the room owner
create or replace function public.approve_access_request(p_room_id uuid, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not is_room_owner(p_room_id) then
    return 'forbidden';
  end if;

  select status into v_status
    from room_access_requests
   where room_id = p_room_id and user_id = p_user_id
   for update;

  if not found then
    return 'not_found';
  end if;
  if v_status <> 'pending' then
    return 'handled';
  end if;

  insert into room_members (room_id, user_id, role)
  values (p_room_id, p_user_id, 'editor')
  on conflict (room_id, user_id) do nothing;

  update room_access_requests
     set status = 'approved'
   where room_id = p_room_id and user_id = p_user_id;

  return 'approved';
end;
$$;
