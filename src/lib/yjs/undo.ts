// Per-user undo/redo scoped to *local* edits only.
//
// trackedOrigins = { LOCAL_ORIGIN } means once realtime lands (Phase 3) a peer's
// incoming updates (applied with a different origin) are never on this user's
// undo stack — Cmd/Ctrl+Z only reverses your own actions.

import * as Y from "yjs";
import { LOCAL_ORIGIN, getShapesMap } from "./doc";

export function createUndoManager(doc: Y.Doc): Y.UndoManager {
  return new Y.UndoManager(getShapesMap(doc), {
    trackedOrigins: new Set([LOCAL_ORIGIN]),
    // Group rapid edits (e.g. the many position writes during one drag) into a
    // single undo step.
    captureTimeout: 400,
  });
}
