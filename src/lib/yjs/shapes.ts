// Read/write helpers over the Yjs shape model (one nested Y.Map per shape, LWW per field).

import * as Y from "yjs";
import type {
  Shape,
  PenShape,
  NoteShape,
  RectShape,
  EllipseShape,
} from "@/types/shapes";
import { LOCAL_ORIGIN, getShapesMap } from "./doc";

function newId(): string {
  return crypto.randomUUID();
}

// --- reading ----------------------------------------------------------------

export function readShape(y: Y.Map<unknown>): Shape {
  const type = y.get("type") as Shape["type"];
  const id = y.get("id") as string;
  const z = y.get("z") as number;
  switch (type) {
    case "pen":
      return {
        type,
        id,
        z,
        points: (y.get("points") as number[]) ?? [],
        color: y.get("color") as string,
        width: y.get("width") as number,
      };
    case "note": {
      const text = y.get("text");
      return {
        type,
        id,
        z,
        x: y.get("x") as number,
        y: y.get("y") as number,
        w: y.get("w") as number,
        h: y.get("h") as number,
        color: y.get("color") as string,
        text: text instanceof Y.Text ? text.toString() : "",
      };
    }
    case "rect":
    case "ellipse":
      return {
        type,
        id,
        z,
        x: y.get("x") as number,
        y: y.get("y") as number,
        w: y.get("w") as number,
        h: y.get("h") as number,
        stroke: y.get("stroke") as string,
        fill: (y.get("fill") as string | null) ?? null,
      };
  }
}

export function readAllShapes(shapesMap: Y.Map<Y.Map<unknown>>): Shape[] {
  const out: Shape[] = [];
  shapesMap.forEach((y) => out.push(readShape(y)));
  return out;
}

/** The live Y.Text backing a note, for the inline editor to bind to. */
export function getNoteText(
  doc: Y.Doc,
  id: string,
): Y.Text | null {
  const y = getShapesMap(doc).get(id);
  if (!y) return null;
  const text = y.get("text");
  return text instanceof Y.Text ? text : null;
}

function nextZ(shapesMap: Y.Map<Y.Map<unknown>>): number {
  let max = 0;
  shapesMap.forEach((y) => {
    const z = (y.get("z") as number) ?? 0;
    if (z > max) max = z;
  });
  return max + 1;
}

// --- creating ---------------------------------------------------------------

type NewPen = Omit<PenShape, "id" | "z"> & { id?: string };
type NewNote = Omit<NoteShape, "id" | "z" | "text"> & {
  id?: string;
  text?: string;
};
type NewRect = Omit<RectShape, "id" | "z"> & { id?: string };
type NewEllipse = Omit<EllipseShape, "id" | "z"> & { id?: string };

export function addShape(
  doc: Y.Doc,
  spec: NewPen | NewNote | NewRect | NewEllipse,
): string {
  const shapesMap = getShapesMap(doc);
  const id = spec.id ?? newId();
  doc.transact(() => {
    const y = new Y.Map<unknown>();
    y.set("id", id);
    y.set("z", nextZ(shapesMap));
    y.set("type", spec.type);
    switch (spec.type) {
      case "pen":
        y.set("points", spec.points);
        y.set("color", spec.color);
        y.set("width", spec.width);
        break;
      case "note": {
        y.set("x", spec.x);
        y.set("y", spec.y);
        y.set("w", spec.w);
        y.set("h", spec.h);
        y.set("color", spec.color);
        const text = new Y.Text();
        if (spec.text) text.insert(0, spec.text);
        y.set("text", text);
        break;
      }
      case "rect":
      case "ellipse":
        y.set("x", spec.x);
        y.set("y", spec.y);
        y.set("w", spec.w);
        y.set("h", spec.h);
        y.set("stroke", spec.stroke);
        y.set("fill", spec.fill);
        break;
    }
    shapesMap.set(id, y);
  }, LOCAL_ORIGIN);
  return id;
}

// --- mutating ---------------------------------------------------------------

/** Translate a shape by a world-space delta (works for every shape type). */
export function translateShape(
  doc: Y.Doc,
  id: string,
  dx: number,
  dy: number,
): void {
  const shapesMap = getShapesMap(doc);
  const y = shapesMap.get(id);
  if (!y) return;
  doc.transact(() => {
    if (y.get("type") === "pen") {
      const pts = (y.get("points") as number[]).slice();
      for (let i = 0; i < pts.length; i += 2) {
        pts[i] += dx;
        pts[i + 1] += dy;
      }
      y.set("points", pts);
    } else {
      y.set("x", (y.get("x") as number) + dx);
      y.set("y", (y.get("y") as number) + dy);
    }
  }, LOCAL_ORIGIN);
}

/** Set absolute geometry (used by drag-to-resize). No-op for pen shapes. */
export function setRect(
  doc: Y.Doc,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const shapesMap = getShapesMap(doc);
  const y0 = shapesMap.get(id);
  if (!y0 || y0.get("type") === "pen") return;
  doc.transact(() => {
    y0.set("x", x);
    y0.set("y", y);
    y0.set("w", w);
    y0.set("h", h);
  }, LOCAL_ORIGIN);
}

/** Recolor a shape. Notes use NOTE_COLORS; others use the shape palette. */
export function setColor(doc: Y.Doc, id: string, color: string): void {
  const shapesMap = getShapesMap(doc);
  const y = shapesMap.get(id);
  if (!y) return;
  doc.transact(() => {
    // Pen/note store their color under "color"; rect/ellipse under "stroke".
    const key = y.get("type") === "rect" || y.get("type") === "ellipse"
      ? "stroke"
      : "color";
    y.set(key, color);
  }, LOCAL_ORIGIN);
}

export function getShapeType(
  doc: Y.Doc,
  id: string,
): Shape["type"] | null {
  const y = getShapesMap(doc).get(id);
  return y ? (y.get("type") as Shape["type"]) : null;
}

export function deleteShape(doc: Y.Doc, id: string): void {
  const shapesMap = getShapesMap(doc);
  doc.transact(() => {
    shapesMap.delete(id);
  }, LOCAL_ORIGIN);
}

export function bringToFront(doc: Y.Doc, id: string): void {
  const shapesMap = getShapesMap(doc);
  const y = shapesMap.get(id);
  if (!y) return;
  doc.transact(() => {
    y.set("z", nextZ(shapesMap));
  }, LOCAL_ORIGIN);
}

export function sendToBack(doc: Y.Doc, id: string): void {
  const shapesMap = getShapesMap(doc);
  const y = shapesMap.get(id);
  if (!y) return;
  let min = 0;
  shapesMap.forEach((s) => {
    const z = (s.get("z") as number) ?? 0;
    if (z < min) min = z;
  });
  doc.transact(() => {
    y.set("z", min - 1);
  }, LOCAL_ORIGIN);
}
