import { describe, it, expect } from "vitest";
import { TOOLS, STROKE_WIDTHS, type Tool } from "./tools";

describe("TOOLS metadata", () => {
  it("covers exactly the five tools, select first", () => {
    const order = TOOLS.map((t) => t.tool);
    expect(order).toEqual(["select", "pen", "note", "rect", "ellipse"]);
  });

  it("gives every tool a single uppercase shortcut, all distinct", () => {
    const shortcuts = TOOLS.map((t) => t.shortcut);
    for (const s of shortcuts) {
      expect(s).toMatch(/^[A-Z]$/);
    }
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it("labels every tool", () => {
    for (const t of TOOLS) {
      expect(t.label.length).toBeGreaterThan(0);
    }
  });
});

describe("STROKE_WIDTHS", () => {
  it("is a strictly ascending list of positive widths", () => {
    expect(STROKE_WIDTHS.length).toBeGreaterThan(0);
    for (let i = 0; i < STROKE_WIDTHS.length; i++) {
      expect(STROKE_WIDTHS[i]).toBeGreaterThan(0);
      if (i > 0) expect(STROKE_WIDTHS[i]).toBeGreaterThan(STROKE_WIDTHS[i - 1]);
    }
  });
});

// Type-level guard: keep the Tool union and the TOOLS table in lockstep.
const _exhaustive: Record<Tool, true> = {
  select: true,
  pen: true,
  note: true,
  rect: true,
  ellipse: true,
};
void _exhaustive;
