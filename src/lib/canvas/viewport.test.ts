import { describe, it, expect } from "vitest";
import {
  initialViewport,
  clampScale,
  screenToWorld,
  worldToScreen,
  pan,
  zoomAt,
  MIN_SCALE,
  MAX_SCALE,
  type Viewport,
} from "./viewport";

describe("clampScale", () => {
  it("keeps values inside [MIN_SCALE, MAX_SCALE]", () => {
    expect(clampScale(1)).toBe(1);
    expect(clampScale(0.0001)).toBe(MIN_SCALE);
    expect(clampScale(1000)).toBe(MAX_SCALE);
  });
});

describe("screen <-> world round trip", () => {
  const vp: Viewport = { scale: 2, offsetX: 50, offsetY: -30 };

  it("worldToScreen applies scale then offset", () => {
    expect(worldToScreen(vp, 10, 10)).toEqual({ x: 70, y: -10 });
  });

  it("screenToWorld inverts worldToScreen", () => {
    const screen = worldToScreen(vp, 123, -45);
    const world = screenToWorld(vp, screen.x, screen.y);
    expect(world.x).toBeCloseTo(123);
    expect(world.y).toBeCloseTo(-45);
  });
});

describe("pan", () => {
  it("shifts the offset by a screen delta and leaves scale alone", () => {
    const next = pan(initialViewport(), 15, -8);
    expect(next).toEqual({ scale: 1, offsetX: 15, offsetY: -8 });
  });
});

describe("zoomAt", () => {
  it("keeps the world point under the anchor fixed", () => {
    const vp: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };
    const anchor = { x: 200, y: 120 };
    const before = screenToWorld(vp, anchor.x, anchor.y);
    const zoomed = zoomAt(vp, 2, anchor.x, anchor.y);
    const after = screenToWorld(zoomed, anchor.x, anchor.y);
    expect(zoomed.scale).toBe(2);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("clamps scale and matches the applied factor at the anchor", () => {
    const vp: Viewport = { scale: MAX_SCALE, offsetX: 10, offsetY: 10 };
    const zoomed = zoomAt(vp, 4, 100, 100); // would exceed MAX_SCALE
    expect(zoomed.scale).toBe(MAX_SCALE);
    // Clamped to no-op factor, so offset is unchanged.
    expect(zoomed.offsetX).toBeCloseTo(10);
    expect(zoomed.offsetY).toBeCloseTo(10);
  });
});
