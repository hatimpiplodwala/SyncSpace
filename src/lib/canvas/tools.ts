// Tool identifiers + toolbar metadata shared by the Toolbar and CanvasLayer.

export type Tool = "select" | "pen" | "note" | "rect" | "ellipse";

export type ToolMeta = {
  tool: Tool;
  label: string;
  shortcut: string; // single key, uppercase
  // Minimal inline icon hint (rendered as text in the button for now).
  glyph: string;
};

export const TOOLS: ToolMeta[] = [
  { tool: "select", label: "Select", shortcut: "V", glyph: "↖" },
  { tool: "pen", label: "Pen", shortcut: "P", glyph: "✎" },
  { tool: "note", label: "Sticky note", shortcut: "N", glyph: "▭" },
  { tool: "rect", label: "Rectangle", shortcut: "R", glyph: "□" },
  { tool: "ellipse", label: "Ellipse", shortcut: "O", glyph: "○" },
];

export const STROKE_WIDTHS = [2, 4, 8, 14] as const;
