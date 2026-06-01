// Plain read-view shape types over the Yjs doc, used by the renderer and hit-tester.

export type ShapeType = "pen" | "note" | "rect" | "ellipse";

export type ShapeBase = {
  id: string;
  z: number;
};

// Pen points are a flat [x0, y0, x1, y1, …] array in world coords.
export type PenShape = ShapeBase & {
  type: "pen";
  points: number[];
  color: string;
  width: number;
};

export type NoteShape = ShapeBase & {
  type: "note";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  text: string;
};

export type RectShape = ShapeBase & {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  fill: string | null;
};

export type EllipseShape = ShapeBase & {
  type: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  fill: string | null;
};

export type Shape = PenShape | NoteShape | RectShape | EllipseShape;

// Axis-aligned bounding box in world coordinates.
export type Bounds = { x: number; y: number; w: number; h: number };

export function shapeBounds(shape: Shape): Bounds {
  if (shape.type === "pen") {
    if (shape.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < shape.points.length; i += 2) {
      const px = shape.points[i];
      const py = shape.points[i + 1];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  // Rect/ellipse/note may be drawn with negative w/h; normalize to top-left.
  const x = shape.w < 0 ? shape.x + shape.w : shape.x;
  const y = shape.h < 0 ? shape.y + shape.h : shape.y;
  return { x, y, w: Math.abs(shape.w), h: Math.abs(shape.h) };
}
