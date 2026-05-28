// Two distinct palettes (PRD §6):
//  - SHAPE_PALETTE: the six fixed colors for strokes/shapes/notes.
//  - USER_PALETTE:  twelve hues for cursors/avatars, assigned deterministically
//    from the user id so a person keeps the same color across sessions.

export const SHAPE_COLORS = {
  black: "#111827",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#a855f7",
} as const;

export type ShapeColorName = keyof typeof SHAPE_COLORS;
export const SHAPE_PALETTE = Object.values(SHAPE_COLORS);

export const USER_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
] as const;

// Stable string hash (FNV-1a-ish) so the color is deterministic per user id.
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function userColor(userId: string): string {
  return USER_PALETTE[hashString(userId) % USER_PALETTE.length];
}
