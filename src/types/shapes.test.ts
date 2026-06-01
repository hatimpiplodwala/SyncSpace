import { describe, it, expect } from "vitest";
import { shapeBounds, type PenShape, type RectShape } from "./shapes";

describe("shapeBounds", () => {
  it("computes the tight box of a pen stroke", () => {
    const pen: PenShape = {
      id: "p",
      z: 1,
      type: "pen",
      points: [10, 20, 40, 5, 25, 60],
      color: "#000",
      width: 2,
    };
    expect(shapeBounds(pen)).toEqual({ x: 10, y: 5, w: 30, h: 55 });
  });

  it("returns a zero box for an empty pen stroke", () => {
    const pen: PenShape = {
      id: "p",
      z: 1,
      type: "pen",
      points: [],
      color: "#000",
      width: 2,
    };
    expect(shapeBounds(pen)).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it("normalizes a rect drawn with negative width/height to top-left", () => {
    const r: RectShape = {
      id: "r",
      z: 1,
      type: "rect",
      x: 100,
      y: 80,
      w: -40,
      h: -20,
      stroke: "#000",
      fill: null,
    };
    expect(shapeBounds(r)).toEqual({ x: 60, y: 60, w: 40, h: 20 });
  });
});
