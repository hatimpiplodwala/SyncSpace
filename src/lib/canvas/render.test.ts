import { describe, it, expect } from "vitest";
import { render, resizeHandleScreenRect } from "./render";
import type { Viewport } from "./viewport";
import type { RectShape, PenShape } from "@/types/shapes";

// Recording stand-in for CanvasRenderingContext2D: every call/assignment is pushed to `calls`.
type Call =
  | { kind: "call"; name: string; args: unknown[] }
  | { kind: "set"; name: string; value: unknown };

function mockCtx() {
  const calls: Call[] = [];
  const handler: ProxyHandler<object> = {
    get(_t, prop: string) {
      if (prop === "measureText") {
        return (text: string) => ({ width: text.length * 7 });
      }
      return (...args: unknown[]) => calls.push({ kind: "call", name: prop, args });
    },
    set(_t, prop: string, value: unknown) {
      calls.push({ kind: "set", name: prop, value });
      return true;
    },
  };
  const ctx = new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const vp: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

const rect = (over: Partial<RectShape> = {}): RectShape => ({
  id: "r",
  z: 1,
  type: "rect",
  x: 0,
  y: 0,
  w: 100,
  h: 50,
  stroke: "#000",
  fill: null,
  ...over,
});

const baseOpts = { width: 800, height: 600, dpr: 2, selectedId: null };

const calls = (c: Call[], name: string) =>
  c.filter((x) => x.kind === "call" && x.name === name);
const sets = (c: Call[], name: string) =>
  c.filter((x): x is Extract<Call, { kind: "set" }> => x.kind === "set" && x.name === name);

describe("render", () => {
  it("clears the whole backing store first (identity transform, dpr-scaled)", () => {
    const { ctx, calls: c } = mockCtx();
    render(ctx, [], vp, baseOpts);
    const first = c.find((x) => x.kind === "call" && x.name === "setTransform");
    expect(first).toEqual({ kind: "call", name: "setTransform", args: [1, 0, 0, 1, 0, 0] });
    expect(calls(c, "clearRect")[0]).toEqual({
      kind: "call",
      name: "clearRect",
      args: [0, 0, 800 * 2, 600 * 2],
    });
  });

  it("draws shapes in ascending z order", () => {
    const { ctx, calls: c } = mockCtx();
    render(ctx, [rect({ id: "top", z: 9, stroke: "red" }), rect({ id: "bot", z: 1, stroke: "blue" })], vp, baseOpts);
    // strokeStyle is assigned right before each rect's strokeRect.
    const order = sets(c, "strokeStyle").map((s) => s.value);
    expect(order).toEqual(["blue", "red"]);
  });

  it("draws a preview shape on top of the committed ones", () => {
    const { ctx, calls: c } = mockCtx();
    render(ctx, [rect()], vp, { ...baseOpts, preview: rect({ id: "preview" }) });
    expect(calls(c, "strokeRect").length).toBe(2);
  });

  it("draws a dashed selection outline only when a shape is selected", () => {
    const withSel = mockCtx();
    render(withSel.ctx, [rect({ id: "r" })], vp, { ...baseOpts, selectedId: "r" });
    expect(calls(withSel.calls, "setLineDash").length).toBeGreaterThan(0);

    const noSel = mockCtx();
    render(noSel.ctx, [rect({ id: "r" })], vp, baseOpts);
    expect(calls(noSel.calls, "setLineDash").length).toBe(0);
  });

  it("skips the dot grid when zoomed too far out to be useful", () => {
    const far = mockCtx();
    render(far.ctx, [], { scale: 0.1, offsetX: 0, offsetY: 0 }, baseOpts);
    expect(calls(far.calls, "arc").length).toBe(0);

    const near = mockCtx();
    render(near.ctx, [], vp, baseOpts);
    expect(calls(near.calls, "arc").length).toBeGreaterThan(0);
  });
});

describe("resizeHandleScreenRect", () => {
  it("is null for pen strokes (not resizable)", () => {
    const pen: PenShape = {
      id: "p",
      z: 1,
      type: "pen",
      points: [0, 0, 10, 10],
      color: "#000",
      width: 2,
    };
    expect(resizeHandleScreenRect(pen, vp)).toBeNull();
  });

  it("centres a handle on the bottom-right corner in screen space", () => {
    const handle = resizeHandleScreenRect(rect({ x: 0, y: 0, w: 100, h: 50 }), {
      scale: 2,
      offsetX: 10,
      offsetY: 20,
    });
    // bottom-right world (100,50) -> screen (210,120); handle centred there.
    expect(handle).toEqual({ x: 210 - 6, y: 120 - 6, w: 12, h: 12 });
  });
});
