// User Timing wrappers around hot paths (CRDT apply, canvas render); no-op without `performance`.

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
      // measure can throw if a mark was evicted; timing is best-effort.
    }
    performance.clearMarks(start);
    performance.clearMarks(end);
    performance.clearMeasures(label);
  }
}
