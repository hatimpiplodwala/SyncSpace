// Postgres durability for the Yjs doc: bootstrap from snapshot + tail, append local updates.

import * as Y from "yjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bytesToPgHex, pgHexToBytes } from "./encoding";

const PERSIST_INTERVAL_MS = 200;
// Back-off when an append fails (offline); the `online` event also kicks an immediate retry.
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

/** Buffer local updates and append to room_updates, retaining bytes until the insert succeeds. */
export function createUpdateFlusher(
  supabase: SupabaseClient,
  roomId: string,
): UpdateFlusher {
  // Updates not yet confirmed written; merged on flush, kept on failure.
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
      // Couldn't persist (usually offline): keep the bytes at the front and retry later.
      pending = [merged, ...pending];
      schedule(RETRY_INTERVAL_MS);
    } else if (pending.length > 0) {
      schedule(PERSIST_INTERVAL_MS); // more arrived while the insert was in flight
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
