// Per-user undo/redo scoped to local edits only (tracked by LOCAL_ORIGIN).

import * as Y from "yjs";
import { LOCAL_ORIGIN, getShapesMap } from "./doc";

export function createUndoManager(doc: Y.Doc): Y.UndoManager {
  return new Y.UndoManager(getShapesMap(doc), {
    trackedOrigins: new Set([LOCAL_ORIGIN]),
    // Group rapid edits (e.g. one drag's many position writes) into a single undo step.
    captureTimeout: 400,
  });
}
