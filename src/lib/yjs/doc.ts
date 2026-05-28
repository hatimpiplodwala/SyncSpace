// Composes the per-room Y.Doc with local IndexedDB persistence.
//
// Phase 2: IndexedDB only — this already gives "reload preserves the board".
// Phase 3 will add the Supabase realtime provider alongside the same doc.

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

// Origin tag for *local* mutations. The UndoManager only tracks changes with
// this origin (so it won't undo a remote peer's edits once realtime lands), and
// the realtime provider will use it to avoid echoing updates back out.
export const LOCAL_ORIGIN = "local";

export type RoomDoc = {
  doc: Y.Doc;
  persistence: IndexeddbPersistence;
  /** Resolves once the IndexedDB cache has been loaded into the doc. */
  whenReady: Promise<void>;
  destroy: () => void;
};

export function createRoomDoc(roomId: string): RoomDoc {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`syncspace:${roomId}`, doc);

  const whenReady = persistence.whenSynced.then(() => undefined);

  return {
    doc,
    persistence,
    whenReady,
    destroy: () => {
      persistence.destroy();
      doc.destroy();
    },
  };
}

/** The top-level map holding every shape (each value is itself a Y.Map). */
export function getShapesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>("shapes");
}
