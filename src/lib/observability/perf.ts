// Lightweight User Timing wrappers around hot paths (CRDT apply, canvas render).
//
// Uses the standard performance.mark / performance.measure API so the spans show
// up in the browser DevTools "Performance" panel (User Timing track) and in any
// PerformanceObserver-based RUM. Guarded so it's a no-op where `performance`
// isn't available (e.g. the server), and marks/measures are cleared after each
// span so the entry buffer can't grow unbounded on the 60fps render path.

const canMeasure =
  typeof performance !== "undefined" &&
  typeof performance.mark === "function" &&
  typeof performance.measure === "function";

/** Time a synchronous block and emit a `label` measure. Returns fn()'s result. */
export function timed<T>(label: string, fn: () => T): T {
  if (!canMeasure) return fn();
  const start = `${label}::start`;
  const end = `${label}::end`;
  performance.mark(start);
  try {
    return fn();
  } finally {
    performance.mark(end);
    try {
      performance.measure(label, start, end);
    } catch {
      // measure can throw if a mark was evicted; ignore — timing is best-effort.
    }
    performance.clearMarks(start);
    performance.clearMarks(end);
    performance.clearMeasures(label);
  }
}
