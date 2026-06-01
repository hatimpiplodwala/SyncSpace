// Throttle + merge Yjs updates into at most one flush per interval (so dragging keeps emitting).

import * as Y from "yjs";

export type Batcher = {
  push: (update: Uint8Array) => void;
  flush: () => void;
  destroy: () => void;
};

export function createBatcher(
  intervalMs: number,
  onFlush: (merged: Uint8Array) => void,
): Batcher {
  let buffer: Uint8Array[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastFlush = 0;

  const doFlush = () => {
    timer = null;
    if (buffer.length === 0) return;
    const merged = buffer.length === 1 ? buffer[0] : Y.mergeUpdates(buffer);
    buffer = [];
    lastFlush = Date.now();
    onFlush(merged);
  };

  return {
    push(update) {
      buffer.push(update);
      if (timer) return;
      const elapsed = Date.now() - lastFlush;
      if (elapsed >= intervalMs) doFlush();
      else timer = setTimeout(doFlush, intervalMs - elapsed);
    },
    flush() {
      if (timer) clearTimeout(timer);
      doFlush();
    },
    destroy() {
      if (timer) clearTimeout(timer);
      timer = null;
      buffer = [];
    },
  };
}
