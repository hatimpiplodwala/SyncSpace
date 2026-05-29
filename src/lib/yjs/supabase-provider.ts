// Bespoke Yjs provider over a Supabase Realtime channel (mirrors the y-websocket
// idea: a dumb pipe carrying opaque Yjs updates; clients converge via CRDT).
//
// On construct:
//   1. listen to local doc updates -> broadcast (batched) + persist
//   2. bootstrap the doc from Postgres (snapshot + tail updates)
//   3. subscribe to the channel; once subscribed, send a sync-request so any
//      peer with newer state than Postgres hands us the diff
//
// Echo/loop avoidance is by Yjs origin: remote updates are applied with `this`
// as origin, and we ignore updates whose origin is `this` (or y-indexeddb, which
// replays local cache on load) so we never re-broadcast or re-persist them.

import * as Y from "yjs";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { bytesToBase64, base64ToBytes } from "./encoding";
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
      void this.channel.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { u: bytesToBase64(merged) },
      });
    });

    doc.on("update", this.handleLocalUpdate);

    this.channel = supabase.channel(`room:${roomId}`, {
      config: { broadcast: { self: false } },
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
        this.onStatus?.("connected");
        // Ask peers for anything we don't have (in case Postgres was stale).
        void this.channel.send({
          type: "broadcast",
          event: "yjs-sync-request",
          payload: { sv: bytesToBase64(Y.encodeStateVector(this.doc)) },
        });
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
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
      Y.applyUpdate(this.doc, base64ToBytes(b64), this);
    } catch (e) {
      console.error("[provider] bad remote update:", e);
    }
  }

  private sendSyncStep(svB64: unknown) {
    if (typeof svB64 !== "string") return;
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
