// Scheduled compaction Lambda: fold each pending room's append log into its
// snapshot. Triggered on a schedule by EventBridge (no input event). Replaces
// the Supabase compact-room edge function + the pg_net trigger.

import { createClient } from "@supabase/supabase-js";
import * as Y from "yjs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Only fold rooms with at least this many log rows; keep in sync with the RPC default.
const MIN_UPDATES = Number(process.env.COMPACTION_MIN_UPDATES ?? 200);
// Cap on log rows pulled per room per run; a larger backlog folds across runs.
const MAX_BATCH = Number(process.env.COMPACTION_MAX_BATCH ?? 5000);

// PostgREST round-trips bytea as a hex string prefixed with "\x".
function pgHexToBytes(hex) {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToPgHex(bytes) {
  let hex = "\\x";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// Fold one room's snapshot + append log into a fresh snapshot, then delete the
// folded rows. Idempotent: snapshot is written before the delete, so a crash
// just re-folds the same rows next run.
async function compactRoom(supabase, roomId) {
  const { data: snap } = await supabase
    .from("room_snapshots")
    .select("state")
    .eq("room_id", roomId)
    .maybeSingle();

  const { data: updates, error: loadErr } = await supabase
    .from("room_updates")
    .select("id, update")
    .eq("room_id", roomId)
    .order("id", { ascending: true })
    .limit(MAX_BATCH);

  if (loadErr) throw new Error(`load ${roomId}: ${loadErr.message}`);
  if (!updates || updates.length === 0) return 0;

  const doc = new Y.Doc();
  if (snap?.state) Y.applyUpdate(doc, pgHexToBytes(snap.state));
  let maxId = 0;
  for (const row of updates) {
    Y.applyUpdate(doc, pgHexToBytes(row.update));
    if (row.id > maxId) maxId = row.id;
  }
  const merged = Y.encodeStateAsUpdate(doc);

  const { error: snapErr } = await supabase.from("room_snapshots").upsert(
    {
      room_id: roomId,
      state: bytesToPgHex(merged),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_id" },
  );
  if (snapErr) throw new Error(`snapshot ${roomId}: ${snapErr.message}`);

  const { error: delErr, count } = await supabase
    .from("room_updates")
    .delete({ count: "exact" })
    .eq("room_id", roomId)
    .lte("id", maxId);
  if (delErr) throw new Error(`delete ${roomId}: ${delErr.message}`);

  return count ?? updates.length;
}

export const handler = async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: rooms, error } = await supabase.rpc("rooms_pending_compaction", {
    p_min: MIN_UPDATES,
  });
  if (error) throw new Error(`rooms_pending_compaction: ${error.message}`);

  let compactedRooms = 0;
  let compactedRows = 0;
  const failures = [];
  for (const { room_id } of rooms ?? []) {
    try {
      const n = await compactRoom(supabase, room_id);
      if (n > 0) compactedRooms++;
      compactedRows += n;
    } catch (e) {
      // One bad room shouldn't abort the sweep; log and continue.
      failures.push(room_id);
      console.error(e instanceof Error ? e.message : e);
    }
  }

  const summary = {
    rooms_scanned: rooms?.length ?? 0,
    rooms_compacted: compactedRooms,
    updates_folded: compactedRows,
    failures: failures.length,
  };
  console.log(JSON.stringify(summary));
  return summary;
};
