import { describe, it, expect } from "vitest";
import { hitTest } from "./hit-test";
import type {
  RectShape,
  EllipseShape,
  PenShape,
  NoteShape,
} from "@/types/shapes";

const rect = (over: Partial<RectShape> = {}): RectShape => ({
  id: "rect",
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

const ellipse = (over: Partial<EllipseShape> = {}): EllipseShape => ({
  id: "ell",
  z: 1,
  type: "ellipse",
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  stroke: "#000",
  fill: null,
  ...over,
});

const pen = (over: Partial<PenShape> = {}): PenShape => ({
  id: "pen",
  z: 1,
  type: "pen",
  points: [0, 0, 100, 0],
  color: "#000",
  width: 2,
  ...over,
});

describe("hitTest", () => {
  it("returns null when nothing is under the pointer", () => {
    expect(hitTest([rect()], 500, 500, 1)).toBeNull();
  });

  it("hits inside a rect's box", () => {
    expect(hitTest([rect()], 50, 25, 1)).toBe("rect");
  });

  it("treats a note as a filled box", () => {
    const note: NoteShape = {
      id: "note",
      z: 1,
      type: "note",
      x: 0,
      y: 0,
      w: 80,
      h: 80,
      color: "#fef08a",
      text: "",
    };
    expect(hitTest([note], 40, 40, 1)).toBe("note");
  });

  it("misses the empty centre of an unfilled ellipse only outside the curve", () => {
    // Corner (95,95) is inside the bounding box but outside the ellipse.
    expect(hitTest([ellipse()], 95, 95, 1)).toBeNull();
    // Centre is inside the ellipse equation.
    expect(hitTest([ellipse()], 50, 50, 1)).toBe("ell");
  });

  it("hits a thin pen stroke within tolerance of the segment", () => {
    // Pointer 3px off a horizontal stroke: within TOLERANCE(6)+width/2.
    expect(hitTest([pen()], 50, 3, 1)).toBe("pen");
    // Far away: miss.
    expect(hitTest([pen()], 50, 40, 1)).toBeNull();
  });

  it("returns the topmost shape by z when several overlap", () => {
    const bottom = rect({ id: "bottom", z: 1 });
    const top = rect({ id: "top", z: 9 });
    expect(hitTest([bottom, top], 50, 25, 1)).toBe("top");
    // Order in the array must not matter — only z.
    expect(hitTest([top, bottom], 50, 25, 1)).toBe("top");
  });

  it("scales tolerance with zoom so grab slop stays ~constant on screen", () => {
    // 5px off the stroke. At scale 1, tol=6 world px -> hit.
    expect(hitTest([pen()], 50, 5, 1)).toBe("pen");
    // Zoomed in 8x, tol shrinks to 0.75 world px -> the same 5px gap misses.
    expect(hitTest([pen()], 50, 5, 8)).toBeNull();
  });
});
