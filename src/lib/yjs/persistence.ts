// Postgres durability for the Yjs doc (PRD §5):
//   - loadFromPostgres: snapshot + tail updates -> apply to the doc on join
//   - createUpdateFlusher: append local updates to room_updates, batched 200 ms
//
// The realtime broadcast (supabase-provider) handles *live* sync; this layer is
// what lets a fresh joiner or a reload reconstruct the board.

import * as Y from "yjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bytesToPgHex, pgHexToBytes } from "./encoding";
import { createBatcher } from "./batch";

const PERSIST_INTERVAL_MS = 200;

/** Apply the stored snapshot then every appended update, in order. */
export async function loadFromPostgres(
  supabase: SupabaseClient,
  roomId: string,
  doc: Y.Doc,
  origin: unknown,
): Promise<void> {
  const { data: snap, error: snapErr } = await supabase
    .from("room_snapshots")
    .select("state")
    .eq("room_id", roomId)
    .maybeSingle<{ state: string }>();
  if (snapErr) console.error("[persistence] snapshot load:", snapErr.message);
  if (snap?.state) {
    try {
      Y.applyUpdate(doc, pgHexToBytes(snap.state), origin);
    } catch (e) {
      console.error("[persistence] bad snapshot:", e);
    }
  }

  const { data: rows, error: updErr } = await supabase
    .from("room_updates")
    .select("update")
    .eq("room_id", roomId)
    .order("id", { ascending: true });
  if (updErr) console.error("[persistence] updates load:", updErr.message);
  for (const row of rows ?? []) {
    try {
      Y.applyUpdate(doc, pgHexToBytes((row as { update: string }).update), origin);
    } catch (e) {
      console.error("[persistence] bad update row:", e);
    }
  }
}

export type UpdateFlusher = {
  queue: (update: Uint8Array) => void;
  destroy: () => void;
};

/** Buffer local updates and append them to room_updates (one merged row / flush). */
export function createUpdateFlusher(
  supabase: SupabaseClient,
  roomId: string,
): UpdateFlusher {
  const batcher = createBatcher(PERSIST_INTERVAL_MS, (merged) => {
    void supabase
      .from("room_updates")
      .insert({ room_id: roomId, update: bytesToPgHex(merged) })
      .then(({ error }) => {
        if (error) console.error("[persistence] append failed:", error.message);
      });
  });
  return {
    queue: (u) => batcher.push(u),
    destroy: () => batcher.flush(), // flush the tail before tearing down
  };
}
