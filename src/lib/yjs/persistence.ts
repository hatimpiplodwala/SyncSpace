// Postgres durability for the Yjs doc: bootstrap from snapshot + tail, append local updates.

import * as Y from "yjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bytesToPgHex, pgHexToBytes } from "./encoding";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

const PERSIST_INTERVAL_MS = 200;
// Back-off when an append fails (offline); the `online` event also kicks an immediate retry.
const RETRY_INTERVAL_MS = 3000;
// PostgREST caps a single response at ~1000 rows by default — page through the tail until empty.
const LOAD_PAGE_SIZE = 1000;

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

  // Page through (id, update) by ascending id; resume from the last id rather than
  // bare offset, so a concurrent append doesn't shift the window and skip a row.
  let lastId = 0;
  for (;;) {
    const { data: rows, error: updErr } = await supabase
      .from("room_updates")
      .select("id, update")
      .eq("room_id", roomId)
      .gt("id", lastId)
      .order("id", { ascending: true })
      .limit(LOAD_PAGE_SIZE);
    if (updErr) {
      console.error("[persistence] updates load:", updErr.message);
      return;
    }
    if (!rows || rows.length === 0) return;
    for (const row of rows) {
      const r = row as { id: number; update: string };
      try {
        Y.applyUpdate(doc, pgHexToBytes(r.update), origin);
      } catch (e) {
        console.error("[persistence] bad update row:", e);
      }
      lastId = r.id;
    }
    if (rows.length < LOAD_PAGE_SIZE) return;
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
  // Cached so pagehide can fire a synchronous keepalive fetch (auth.getSession is async).
  let accessToken: string | null = null;

  void supabase.auth
    .getSession()
    .then(({ data }) => {
      accessToken = data.session?.access_token ?? null;
    });
  const authSub = supabase.auth.onAuthStateChange((_event, session) => {
    accessToken = session?.access_token ?? null;
  });

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

  // Sync drain via fetch+keepalive: survives tab close (regular fetch is killed on unload).
  // Headers ruled out sendBeacon — PostgREST needs apikey + Bearer.
  function flushKeepalive() {
    if (pending.length === 0) return;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !accessToken) return;
    const merged =
      pending.length === 1 ? pending[0] : Y.mergeUpdates(pending);
    pending = [];
    try {
      void fetch(`${SUPABASE_URL}/rest/v1/room_updates`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          room_id: roomId,
          update: bytesToPgHex(merged),
        }),
      });
    } catch {
      // Best effort; IndexedDB still holds the doc for next session on this device.
    }
  }

  const onOnline = () => schedule(0);
  const onPageHide = () => flushKeepalive();
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", onPageHide);
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
        window.removeEventListener("pagehide", onPageHide);
      }
      authSub.data.subscription.unsubscribe();
      flushKeepalive(); // best-effort final append; IndexedDB is the durability net
    },
  };
}
