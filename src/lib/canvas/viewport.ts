// Pan/zoom state and world <-> screen transforms.
//
// Model: screen = world * scale + offset  (offset is in screen/CSS pixels).
// The renderer applies the same transform to the 2D context; pointer math uses
// these helpers so cursors and hit-tests stay correct at any zoom.

export type Viewport = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;

export const initialViewport = (): Viewport => ({
  scale: 1,
  offsetX: 0,
  offsetY: 0,
});

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export type Point = { x: number; y: number };

export function screenToWorld(vp: Viewport, sx: number, sy: number): Point {
  return {
    x: (sx - vp.offsetX) / vp.scale,
    y: (sy - vp.offsetY) / vp.scale,
  };
}

export function worldToScreen(vp: Viewport, wx: number, wy: number): Point {
  return {
    x: wx * vp.scale + vp.offsetX,
    y: wy * vp.scale + vp.offsetY,
  };
}

// Pan by a screen-space delta.
export function pan(vp: Viewport, dx: number, dy: number): Viewport {
  return { ...vp, offsetX: vp.offsetX + dx, offsetY: vp.offsetY + dy };
}

// Zoom by `factor`, keeping the world point under the screen anchor fixed.
export function zoomAt(
  vp: Viewport,
  factor: number,
  anchorX: number,
  anchorY: number,
): Viewport {
  const nextScale = clampScale(vp.scale * factor);
  // Effective factor after clamping (so anchor math matches the applied scale).
  const applied = nextScale / vp.scale;
  return {
    scale: nextScale,
    offsetX: anchorX - (anchorX - vp.offsetX) * applied,
    offsetY: anchorY - (anchorY - vp.offsetY) * applied,
  };
}
