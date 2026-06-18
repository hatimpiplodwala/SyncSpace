// Yjs provider over a Supabase Realtime channel: a dumb pipe of opaque updates, converging via CRDT.
// Loops are avoided by Yjs origin — remote updates apply with `this`, and `this`/y-indexeddb origins are ignored.

import * as Y from "yjs";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { bytesToBase64, base64ToBytes } from "./encoding";
import { timed } from "@/lib/observability/perf";
import { createBatcher, type Batcher } from "./batch";
import {
  loadFromPostgres,
  createUpdateFlusher,
  type UpdateFlusher,
} from "./persistence";

// ~25 Hz: smooth remote motion without a message per pointermove.
const BROADCAST_INTERVAL_MS = 40;

export type ProviderStatus = "connecting" | "connected" | "disconnected";

type Options = {
  ignoreOrigins?: unknown[];
  onStatus?: (status: ProviderStatus) => void;
};

export class SupabaseProvider {
  private readonly supabase: SupabaseClient;
  private readonly doc: Y.Doc;
  private readonly channel: RealtimeChannel;
  private readonly flusher: UpdateFlusher;
  private readonly broadcast: Batcher;
  private readonly ignored: Set<unknown>;
  private readonly onStatus?: (status: ProviderStatus) => void;
  private destroyed = false;
  // Only push over the socket when joined; otherwise realtime-js falls back to REST.
  private connected = false;
  // True if a local update was made while disconnected — we must broadcast our state on
  // reconnect so peers learn about offline edits (the SV-exchange only covers the peer→us
  // direction). False in steady state means we can skip the expensive full-state push.
  private unbroadcastSinceConnect = false;

  constructor(
    supabase: SupabaseClient,
    roomId: string,
    doc: Y.Doc,
    opts: Options = {},
  ) {
    this.supabase = supabase;
    this.doc = doc;
    this.onStatus = opts.onStatus;
    this.ignored = new Set<unknown>([this, ...(opts.ignoreOrigins ?? [])]);
    this.flusher = createUpdateFlusher(supabase, roomId);
    this.broadcast = createBatcher(BROADCAST_INTERVAL_MS, (merged) => {
      // Persistence is handled separately; peers reconcile via the on-join sync.
      if (!this.connected) {
        this.unbroadcastSinceConnect = true;
        return;
      }
      void this.channel.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { u: bytesToBase64(merged) },
      });
    });

    doc.on("update", this.handleLocalUpdate);

    // private: true makes Realtime enforce RLS on realtime.messages (see 0005 migration),
    // so only room members can receive/send on this topic.
    this.channel = supabase.channel(`room:${roomId}`, {
      config: { private: true, broadcast: { self: false } },
    });
    this.channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }) =>
        this.applyRemote(payload.u),
      )
      .on("broadcast", { event: "yjs-sync-request" }, ({ payload }) =>
        this.sendSyncStep(payload.sv),
      )
      .on("broadcast", { event: "yjs-sync-step" }, ({ payload }) =>
        this.applyRemote(payload.u),
      );

    void this.start(supabase, roomId);
  }

  private start = async (supabase: SupabaseClient, roomId: string) => {
    this.onStatus?.("connecting");
    try {
      await loadFromPostgres(supabase, roomId, this.doc, this);
    } catch (e) {
      console.error("[provider] bootstrap failed:", e);
    }
    if (this.destroyed) return;

    this.channel.subscribe((status) => {
      if (this.destroyed) return;
      if (status === "SUBSCRIBED") {
        const hadOfflineEdits = this.unbroadcastSinceConnect;
        this.connected = true;
        this.unbroadcastSinceConnect = false;
        this.onStatus?.("connected");
        // Pull peers' newer state via SV exchange — peers reply with just the delta.
        void this.channel.send({
          type: "broadcast",
          event: "yjs-sync-request",
          payload: { sv: bytesToBase64(Y.encodeStateVector(this.doc)) },
        });
        // Push our state ONLY if we made local edits while disconnected; otherwise live
        // broadcasts (yjs-update) already kept peers current and a full-state blast is waste.
        if (hadOfflineEdits) {
          void this.channel.send({
            type: "broadcast",
            event: "yjs-sync-step",
            payload: { u: bytesToBase64(Y.encodeStateAsUpdate(this.doc)) },
          });
        }
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        this.connected = false;
        this.onStatus?.("disconnected");
      }
    });
  };

  private handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
    if (this.ignored.has(origin)) return;
    this.broadcast.push(update);
    this.flusher.queue(update);
  };

  private applyRemote(b64: unknown) {
    if (typeof b64 !== "string") return;
    try {
      timed("crdt-apply", () =>
        Y.applyUpdate(this.doc, base64ToBytes(b64), this),
      );
    } catch (e) {
      console.error("[provider] bad remote update:", e);
    }
  }

  private sendSyncStep(svB64: unknown) {
    if (typeof svB64 !== "string" || !this.connected) return;
    const diff = Y.encodeStateAsUpdate(this.doc, base64ToBytes(svB64));
    void this.channel.send({
      type: "broadcast",
      event: "yjs-sync-step",
      payload: { u: bytesToBase64(diff) },
    });
  }

  destroy() {
    this.destroyed = true;
    this.doc.off("update", this.handleLocalUpdate);
    this.broadcast.destroy();
    this.flusher.destroy();
    void this.supabase.removeChannel(this.channel);
  }
}
