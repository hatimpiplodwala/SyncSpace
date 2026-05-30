"use client";

// Multi-user cursor presence over a *dedicated* Supabase Realtime channel
// (`presence:<roomId>`), deliberately separate from the doc-sync channel so
// 30 Hz cursor spam never touches the CRDT update log (PRD §3).
//
//   - Roster (who's online + name/color) comes from Realtime *presence* track,
//     which gives reliable join/leave events.
//   - Cursor positions ride a high-frequency *broadcast* event (presence track
//     isn't meant to be re-set 30×/sec).
//
// Each browser tab gets its own `conn` id so two tabs of the same account show
// two distinct cursors.

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CursorBuffer, createThrottle, CURSOR_INTERVAL_MS } from "./throttle";

export type Me = { id: string; name: string; color: string };
export type Peer = { conn: string; name: string; color: string };

type Meta = { conn: string; user_id: string; name: string; color: string };

function newConnId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export function usePresence(roomId: string, me: Me) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [buffer] = useState(() => new CursorBuffer());
  const [conn] = useState(newConnId);

  // Throttled cursor sender, wired up inside the effect (where it can close over
  // the live channel) and surfaced to callers through this ref.
  const sendRef = useRef<(x: number, y: number) => void>(() => {});

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence:${roomId}`, {
      config: { presence: { key: conn }, broadcast: { self: false } },
    });

    const throttle = createThrottle(CURSOR_INTERVAL_MS, (x: number, y: number) => {
      void channel.send({
        type: "broadcast",
        event: "cursor",
        payload: { conn, x, y },
      });
    });
    sendRef.current = throttle.call;

    const syncRoster = () => {
      const state = channel.presenceState<Meta>();
      const next: Peer[] = [];
      for (const key in state) {
        for (const meta of state[key]) {
          if (meta.conn === conn) continue; // skip ourselves
          next.push({ conn: meta.conn, name: meta.name, color: meta.color });
        }
      }
      setPeers(next);
    };

    channel
      .on("presence", { event: "sync" }, syncRoster)
      .on("presence", { event: "join" }, syncRoster)
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        for (const p of leftPresences as unknown as Meta[]) buffer.remove(p.conn);
        syncRoster();
      })
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        if (payload && payload.conn !== conn) {
          buffer.set(payload.conn, payload.x, payload.y);
        }
      });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track({
          conn,
          user_id: me.id,
          name: me.name,
          color: me.color,
        } satisfies Meta);
      }
    });

    return () => {
      throttle.cancel();
      sendRef.current = () => {};
      void supabase.removeChannel(channel);
    };
  }, [roomId, conn, buffer, me.id, me.name, me.color]);

  const sendCursor = useCallback((x: number, y: number) => {
    sendRef.current(x, y);
  }, []);

  return { peers, buffer, sendCursor };
}
