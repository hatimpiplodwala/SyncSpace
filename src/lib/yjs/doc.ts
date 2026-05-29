// Composes the per-room Y.Doc with local IndexedDB persistence.
//
// Phase 2: IndexedDB only — this already gives "reload preserves the board".
// Phase 3 will add the Supabase realtime provider alongside the same doc.

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import {
  SupabaseProvider,
  type ProviderStatus,
} from "./supabase-provider";

// Origin tag for *local* mutations. The UndoManager only tracks changes with
// this origin (so it won't undo a remote peer's edits), and the realtime
// provider broadcasts/persists local edits while ignoring its own + indexeddb.
export const LOCAL_ORIGIN = "local";

export type RoomDoc = {
  doc: Y.Doc;
  persistence: IndexeddbPersistence;
  /** Null when Supabase isn't configured (local-only mode). */
  provider: SupabaseProvider | null;
  /** Resolves once the IndexedDB cache has been loaded into the doc. */
  whenReady: Promise<void>;
  destroy: () => void;
};

export type RoomDocOptions = {
  onStatus?: (status: ProviderStatus) => void;
};

export function createRoomDoc(
  roomId: string,
  opts: RoomDocOptions = {},
): RoomDoc {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`syncspace:${roomId}`, doc);
  const whenReady = persistence.whenSynced.then(() => undefined);

  // Compose realtime sync + Postgres durability over the same doc. Without
  // config we stay local-only (IndexedDB), exactly like Phase 2.
  let provider: SupabaseProvider | null = null;
  if (isSupabaseConfigured) {
    provider = new SupabaseProvider(createClient(), roomId, doc, {
      ignoreOrigins: [persistence], // don't re-sync the local cache replay
      onStatus: opts.onStatus,
    });
  }

  return {
    doc,
    persistence,
    provider,
    whenReady,
    destroy: () => {
      provider?.destroy();
      persistence.destroy();
      doc.destroy();
    },
  };
}

/** The top-level map holding every shape (each value is itself a Y.Map). */
export function getShapesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>("shapes");
}
