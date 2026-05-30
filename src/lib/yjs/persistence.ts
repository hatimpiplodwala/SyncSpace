// Postgres durability for the Yjs doc (PRD §5):
//   - loadFromPostgres: snapshot + tail updates -> apply to the doc on join
//   - createUpdateFlusher: append local updates to room_updates, batched 200 ms
//
// The realtime broadcast (supabase-provider) handles *live* sync; this layer is
// what lets a fresh joiner or a reload reconstruct the board.

import * as Y from "yjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bytesToPgHex, pgHexToBytes } from "./encoding";

const PERSIST_INTERVAL_MS = 200;
// Back-off used when an append fails (typically: we're offline). The browser
// `online` event also kicks an immediate retry, so this is just a safety net.
const RETRY_INTERVAL_MS = 3000;

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

/**
 * Buffer local updates and append them to room_updates (one merged row / flush).
 *
 * Unlike a fire-and-forget batcher, this retains updates until the insert
 * actually succeeds: while offline the insert fails, so the merged bytes are
 * kept and retried (on the next queue, on a back-off timer, and immediately on
 * the browser `online` event). This is what lets edits made while disconnected
 * reach durable storage once the connection returns — without it, offline
 * strokes would live only in the local IndexedDB cache and never reach Postgres
 * (so a fresh joiner would never see them).
 */
export function createUpdateFlusher(
  supabase: SupabaseClient,
  roomId: string,
): UpdateFlusher {
  // Updates not yet confirmed written. Merged on flush; kept on failure.
  let pending: Uint8Array[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let destroyed = false;

  const schedule = (ms: number) => {
    if (timer || destroyed) return;
    timer = setTimeout(flush, ms);
  };

  async function flush() {
    timer = null;
    if (inFlight || pending.length === 0) return;

    const merged =
      pending.length === 1 ? pending[0] : Y.mergeUpdates(pending);
    pending = [];
    inFlight = true;
    const { error } = await supabase
      .from("room_updates")
      .insert({ room_id: roomId, update: bytesToPgHex(merged) });
    inFlight = false;

    if (error) {
      // Couldn't persist (usually offline): keep the bytes at the front so
      // they're merged with anything queued since, and try again later.
      pending = [merged, ...pending];
      schedule(RETRY_INTERVAL_MS);
    } else if (pending.length > 0) {
      // More arrived while the insert was in flight.
      schedule(PERSIST_INTERVAL_MS);
    }
  }

  const onOnline = () => schedule(0);
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
  }

  return {
    queue(u) {
      pending.push(u);
      schedule(PERSIST_INTERVAL_MS);
    },
    destroy() {
      destroyed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
      }
      void flush(); // best-effort final append (the doc is safe in IndexedDB)
    },
  };
}
