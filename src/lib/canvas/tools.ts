// Tool identifiers + toolbar metadata shared by the Toolbar and CanvasLayer.

export type Tool = "select" | "pen" | "note" | "rect" | "ellipse";

export type ToolMeta = {
  tool: Tool;
  label: string;
  shortcut: string; // single key, uppercase
};

// Icons live in the Toolbar (lucide), keyed by `tool`.
export const TOOLS: ToolMeta[] = [
  { tool: "select", label: "Select", shortcut: "V" },
  { tool: "pen", label: "Pen", shortcut: "P" },
  { tool: "note", label: "Sticky note", shortcut: "N" },
  { tool: "rect", label: "Rectangle", shortcut: "R" },
  { tool: "ellipse", label: "Ellipse", shortcut: "O" },
];

export const STROKE_WIDTHS = [2, 4, 8, 14] as const;
