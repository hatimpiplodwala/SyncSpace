// Presence plumbing for cursors: throttle broadcasts to ~30 Hz and ease peers between samples.

import type { Point } from "@/lib/canvas/viewport";

export const CURSOR_HZ = 30;
export const CURSOR_INTERVAL_MS = Math.round(1000 / CURSOR_HZ); // ~33 ms

// Throttle: at most once per interval with the latest args; fires immediately when idle.
export function createThrottle<A extends unknown[]>(
  intervalMs: number,
  fn: (...args: A) => void,
): { call: (...args: A) => void; cancel: () => void } {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;

  const run = () => {
    last = Date.now();
    timer = null;
    if (pending) {
      const args = pending;
      pending = null;
      fn(...args);
    }
  };

  return {
    call: (...args: A) => {
      pending = args;
      const elapsed = Date.now() - last;
      if (elapsed >= intervalMs) run();
      else if (timer == null) timer = setTimeout(run, intervalMs - elapsed);
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

// Time constant for the exponential smoothing (ms). Lower = snappier/less lag.
const SMOOTH_TAU = 70;

type Track = {
  tx: number; // target (latest received) world coords
  ty: number;
  cx: number; // current (rendered) world coords
  cy: number;
  started: boolean;
};

/** Holds each peer's latest cursor target and eases the rendered position toward it. */
export class CursorBuffer {
  private peers = new Map<string, Track>();

  /** Record the newest world-space position for a peer. */
  set(id: string, x: number, y: number): void {
    const t = this.peers.get(id);
    if (t) {
      t.tx = x;
      t.ty = y;
      t.started = true;
    } else {
      this.peers.set(id, { tx: x, ty: y, cx: x, cy: y, started: true });
    }
  }

  remove(id: string): void {
    this.peers.delete(id);
  }

  /** Ease every cursor toward its target. `dtMs` is the frame delta. */
  tick(dtMs: number): void {
    const a = 1 - Math.exp(-dtMs / SMOOTH_TAU);
    for (const t of this.peers.values()) {
      t.cx += (t.tx - t.cx) * a;
      t.cy += (t.ty - t.cy) * a;
    }
  }

  /** Current rendered world position, or null until the first sample arrives. */
  get(id: string): Point | null {
    const t = this.peers.get(id);
    return t && t.started ? { x: t.cx, y: t.cy } : null;
  }
}
