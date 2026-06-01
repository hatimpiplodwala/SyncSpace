// Pointer (world coords) -> topmost shape id, scanning in descending z.

import type { Shape } from "@/types/shapes";
import { shapeBounds } from "@/types/shapes";

// Extra world-space slop so thin pen strokes / outlines are easy to grab.
const TOLERANCE = 6;

export function hitTest(
  shapes: Shape[],
  wx: number,
  wy: number,
  scale: number,
): string | null {
  // Tolerance shrinks in world space as you zoom in (so it's a constant ~6px).
  const tol = TOLERANCE / scale;
  const ordered = [...shapes].sort((a, b) => b.z - a.z);
  for (const shape of ordered) {
    if (hitShape(shape, wx, wy, tol)) return shape.id;
  }
  return null;
}

function hitShape(shape: Shape, wx: number, wy: number, tol: number): boolean {
  if (shape.type === "pen") {
    const p = shape.points;
    for (let i = 0; i < p.length - 2; i += 2) {
      if (distToSegment(wx, wy, p[i], p[i + 1], p[i + 2], p[i + 3]) <= tol + shape.width / 2) {
        return true;
      }
    }
    // Single-dot stroke.
    if (p.length === 2) {
      return Math.hypot(wx - p[0], wy - p[1]) <= tol + shape.width / 2;
    }
    return false;
  }

  const b = shapeBounds(shape);
  if (shape.type === "ellipse") {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const rx = b.w / 2 + tol;
    const ry = b.h / 2 + tol;
    if (rx <= 0 || ry <= 0) return false;
    const nx = (wx - cx) / rx;
    const ny = (wy - cy) / ry;
    return nx * nx + ny * ny <= 1;
  }

  // rect + note: filled boxes (note is a solid card).
  return (
    wx >= b.x - tol &&
    wx <= b.x + b.w + tol &&
    wy >= b.y - tol &&
    wy <= b.y + b.h + tol
  );
}

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
