-- 0006: replace the pg_net edge-function compaction trigger with a scheduled
-- AWS Lambda sweep.
--
-- Old model (0002/0003): an AFTER INSERT trigger on room_updates fired
-- net.http_post() to the Supabase edge function whenever a room's log crossed a
-- threshold. New model: an EventBridge-scheduled Lambda periodically asks which
-- rooms have a backlog (rooms_pending_compaction) and folds each one, using the
-- service-role key. This removes the pg_net dependency and the per-insert
-- trigger cost.
--
-- DEPLOY ORDER: apply this together with the Lambda going live. Between dropping
-- the trigger and the first Lambda run, compaction simply pauses — the app stays
-- correct (it replays snapshot + full append log), so the gap is harmless.

drop trigger if exists room_updates_compaction on public.room_updates;
drop function if exists public.trigger_room_compaction();
drop table if exists private.compaction_config;

-- Rooms whose append-log row count is at/above the fold threshold. Called by the
-- Lambda via PostgREST rpc with the service-role key; locked to service_role.
create or replace function public.rooms_pending_compaction(p_min int default 200)
returns table (room_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select room_id
  from public.room_updates
  group by room_id
  having count(*) >= p_min;
$$;

revoke all on function public.rooms_pending_compaction(int) from public;
grant execute on function public.rooms_pending_compaction(int) to service_role;
