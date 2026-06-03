"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import type { Shape } from "@/types/shapes";
import { shapeBounds } from "@/types/shapes";
import { render, resizeHandleScreenRect } from "@/lib/canvas/render";
import { timed } from "@/lib/observability/perf";
import { hitTest } from "@/lib/canvas/hit-test";
import {
  type Viewport,
  type Point,
  initialViewport,
  screenToWorld,
  worldToScreen,
  pan,
  zoomAt,
} from "@/lib/canvas/viewport";
import { type Tool } from "@/lib/canvas/tools";
import { getShapesMap } from "@/lib/yjs/doc";
import { isTextTarget } from "@/lib/utils";
import {
  readAllShapes,
  getNoteText,
  addShape,
  translateShape,
  setRect,
} from "@/lib/yjs/shapes";
import { StickyNoteEditor } from "./StickyNoteEditor";

const NOTE_W = 180;
const NOTE_H = 130;
const MIN_SHAPE_SIZE = 4; // world px; smaller drags are treated as a click
const MIN_RESIZE = 24; // world px floor when dragging the resize handle

type Props = {
  doc: Y.Doc;
  tool: Tool;
  colorHex: string;
  noteColorHex: string;
  strokeWidth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToolChange: (t: Tool) => void;
  /** Report viewport changes so the presence overlay can re-project cursors. */
  onViewportChange?: (vp: Viewport) => void;
  /** Report the local cursor in world coords (null when it leaves the canvas). */
  onCursorMove?: (world: Point | null) => void;
};

// Active interaction. Only one runs at a time (multi-touch becomes "pinch").
type Gesture =
  | { kind: "none" }
  | { kind: "pan"; lastX: number; lastY: number }
  | { kind: "pinch"; prevDist: number; prevMidX: number; prevMidY: number }
  | { kind: "pen"; points: number[] }
  | { kind: "create"; sx: number; sy: number; cx: number; cy: number }
  | { kind: "move"; id: string; lastWX: number; lastWY: number; moved: boolean }
  | { kind: "resize"; id: string; bx: number; by: number };

export function CanvasLayer({
  doc,
  tool,
  colorHex,
  noteColorHex,
  strokeWidth,
  selectedId,
  onSelect,
  onToolChange,
  onViewportChange,
  onCursorMove,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const viewportRef = useRef(viewport);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<Gesture>({ kind: "none" });
  const previewRef = useRef<Shape | null>(null);
  const spaceDownRef = useRef(false);

  // Presence callbacks read through a ref so setViewportSynced stays stable.
  const presenceRef = useRef({ onViewportChange, onCursorMove });
  useEffect(() => {
    presenceRef.current = { onViewportChange, onCursorMove };
  }, [onViewportChange, onCursorMove]);
  const lastScreenRef = useRef<{ x: number; y: number } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Keep the draw closure fresh so the rAF callback always sees latest props.
  const drawRef = useRef<() => void>(() => {});
  const rafRef = useRef<number | null>(null);

  const setViewportSynced = useCallback((next: Viewport) => {
    viewportRef.current = next;
    setViewport(next);
    presenceRef.current.onViewportChange?.(next);
    // Re-project the stationary cursor so peers see it track its world point as we pan/zoom.
    const last = lastScreenRef.current;
    if (last) {
      const w = screenToWorld(next, last.x, last.y);
      presenceRef.current.onCursorMove?.(w);
    }
  }, []);

  // --- drawing --------------------------------------------------------------
  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    const shapes = readAllShapes(getShapesMap(doc));
    timed("canvas-render", () =>
      render(ctx, shapes, viewportRef.current, {
        width: w,
        height: h,
        dpr,
        selectedId,
        preview: previewRef.current,
        hideTextForId: editingId,
      }),
    );
  }, [doc, selectedId, editingId]);

  // Keep the rAF callback pointing at the freshest draw closure.
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawRef.current();
    });
  }, []);

  // Redraw whenever React-owned inputs change.
  useEffect(() => {
    scheduleDraw();
  }, [viewport, selectedId, editingId, scheduleDraw]);

  // --- canvas sizing (DPR aware) -------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    ctxRef.current = canvas.getContext("2d");

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      scheduleDraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [scheduleDraw]);

  // Report the initial viewport once so the presence overlay starts aligned.
  useEffect(() => {
    presenceRef.current.onViewportChange?.(viewportRef.current);
  }, []);

  // --- subscribe to doc changes --------------------------------------------
  useEffect(() => {
    const shapesMap = getShapesMap(doc);
    const onChange = () => scheduleDraw();
    shapesMap.observeDeep(onChange);
    return () => shapesMap.unobserveDeep(onChange);
  }, [doc, scheduleDraw]);

  // --- space key = temporary pan -------------------------------------------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTextTarget(e.target)) spaceDownRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDownRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // --- wheel (native, non-passive so preventDefault works) ------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { sx, sy } = localPoint(canvas, e.clientX, e.clientY);
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        setViewportSynced(zoomAt(viewportRef.current, factor, sx, sy));
      } else {
        setViewportSynced(pan(viewportRef.current, -e.deltaX, -e.deltaY));
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [setViewportSynced]);

  // --- pointer handlers -----------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const { sx, sy } = localPoint(canvas, e.clientX, e.clientY);
    pointersRef.current.set(e.pointerId, { x: sx, y: sy });

    // Second finger -> switch to pinch, abandoning any single-pointer gesture.
    if (pointersRef.current.size === 2) {
      previewRef.current = null;
      const [a, b] = [...pointersRef.current.values()];
      gestureRef.current = {
        kind: "pinch",
        prevDist: Math.hypot(a.x - b.x, a.y - b.y),
        prevMidX: (a.x + b.x) / 2,
        prevMidY: (a.y + b.y) / 2,
      };
      scheduleDraw();
      return;
    }
    if (pointersRef.current.size > 2) return;

    const vp = viewportRef.current;
    const world = screenToWorld(vp, sx, sy);

    // Explicit pan: space held or middle mouse button.
    if (spaceDownRef.current || e.button === 1) {
      gestureRef.current = { kind: "pan", lastX: sx, lastY: sy };
      return;
    }

    switch (tool) {
      case "select": {
        const shapes = readAllShapes(getShapesMap(doc));
        // The selected shape's resize handle wins over everything beneath it.
        if (selectedId) {
          const sel = shapes.find((s) => s.id === selectedId);
          const handle = sel ? resizeHandleScreenRect(sel, vp) : null;
          if (
            sel &&
            handle &&
            sx >= handle.x &&
            sx <= handle.x + handle.w &&
            sy >= handle.y &&
            sy <= handle.y + handle.h
          ) {
            const b = shapeBounds(sel);
            gestureRef.current = { kind: "resize", id: sel.id, bx: b.x, by: b.y };
            break;
          }
        }
        const id = hitTest(shapes, world.x, world.y, vp.scale);
        if (id) {
          onSelect(id);
          gestureRef.current = {
            kind: "move",
            id,
            lastWX: world.x,
            lastWY: world.y,
            moved: false,
          };
        } else {
          onSelect(null);
          gestureRef.current = { kind: "pan", lastX: sx, lastY: sy };
        }
        break;
      }
      case "pen":
        gestureRef.current = { kind: "pen", points: [world.x, world.y] };
        break;
      case "note": {
        const id = addShape(doc, {
          type: "note",
          x: world.x,
          y: world.y,
          w: NOTE_W,
          h: NOTE_H,
          color: noteColorHex,
        });
        onSelect(id);
        setEditingId(id);
        onToolChange("select");
        gestureRef.current = { kind: "none" };
        break;
      }
      case "rect":
      case "ellipse":
        gestureRef.current = { kind: "create", sx: world.x, sy: world.y, cx: world.x, cy: world.y };
        break;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { sx, sy } = localPoint(canvas, e.clientX, e.clientY);
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: sx, y: sy });
    }
    const g = gestureRef.current;

    if (g.kind === "pinch") {
      const pts = [...pointersRef.current.values()];
      if (pts.length < 2) return;
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      let vp = viewportRef.current;
      if (g.prevDist > 0) vp = zoomAt(vp, dist / g.prevDist, midX, midY);
      vp = pan(vp, midX - g.prevMidX, midY - g.prevMidY);
      g.prevDist = dist;
      g.prevMidX = midX;
      g.prevMidY = midY;
      setViewportSynced(vp);
      return;
    }

    const vp = viewportRef.current;
    const world = screenToWorld(vp, sx, sy);

    // Broadcast the local cursor (world coords) for presence, whatever gesture is in flight.
    lastScreenRef.current = { x: sx, y: sy };
    presenceRef.current.onCursorMove?.(world);

    switch (g.kind) {
      case "pan":
        setViewportSynced(pan(vp, sx - g.lastX, sy - g.lastY));
        g.lastX = sx;
        g.lastY = sy;
        break;
      case "pen":
        g.points.push(world.x, world.y);
        previewRef.current = {
          type: "pen",
          id: "__preview",
          z: Number.MAX_SAFE_INTEGER,
          points: g.points,
          color: colorHex,
          width: strokeWidth,
        };
        scheduleDraw();
        break;
      case "create":
        g.cx = world.x;
        g.cy = world.y;
        previewRef.current = {
          type: tool === "ellipse" ? "ellipse" : "rect",
          id: "__preview",
          z: Number.MAX_SAFE_INTEGER,
          x: g.sx,
          y: g.sy,
          w: g.cx - g.sx,
          h: g.cy - g.sy,
          stroke: colorHex,
          fill: null,
        };
        scheduleDraw();
        break;
      case "move": {
        translateShape(doc, g.id, world.x - g.lastWX, world.y - g.lastWY);
        g.lastWX = world.x;
        g.lastWY = world.y;
        g.moved = true;
        break;
      }
      case "resize": {
        const w = Math.max(MIN_RESIZE, world.x - g.bx);
        const h = Math.max(MIN_RESIZE, world.y - g.by);
        setRect(doc, g.id, g.bx, g.by, w, h);
        break;
      }
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    canvas?.releasePointerCapture?.(e.pointerId);
    pointersRef.current.delete(e.pointerId);
    const g = gestureRef.current;

    // Finish gestures only when the last pointer lifts.
    if (pointersRef.current.size >= 1) {
      // Leaving a pinch with one finger down: stop transforming until all fingers lift.
      if (g.kind === "pinch") gestureRef.current = { kind: "none" };
      return;
    }

    if (g.kind === "pen") {
      if (g.points.length >= 2) {
        addShape(doc, {
          type: "pen",
          points: g.points,
          color: colorHex,
          width: strokeWidth,
        });
      }
    } else if (g.kind === "create") {
      // Normalize so x,y is top-left and w,h are positive.
      const x = Math.min(g.sx, g.cx);
      const y = Math.min(g.sy, g.cy);
      const w = Math.abs(g.cx - g.sx);
      const h = Math.abs(g.cy - g.sy);
      if (w >= MIN_SHAPE_SIZE && h >= MIN_SHAPE_SIZE) {
        const id = addShape(doc, {
          type: tool === "ellipse" ? "ellipse" : "rect",
          x,
          y,
          w,
          h,
          stroke: colorHex,
          fill: null,
        });
        onSelect(id);
        onToolChange("select");
      }
    }

    previewRef.current = null;
    gestureRef.current = { kind: "none" };
    scheduleDraw();
  };

  const onPointerLeave = () => {
    lastScreenRef.current = null;
    presenceRef.current.onCursorMove?.(null);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { sx, sy } = localPoint(canvas, e.clientX, e.clientY);
    const vp = viewportRef.current;
    const world = screenToWorld(vp, sx, sy);
    const shapes = readAllShapes(getShapesMap(doc));
    const id = hitTest(shapes, world.x, world.y, vp.scale);
    if (id && shapes.find((s) => s.id === id)?.type === "note") {
      onSelect(id);
      setEditingId(id);
    }
  };

  // --- sticky note editor overlay ------------------------------------------
  let editor: React.ReactNode = null;
  if (editingId) {
    const note = readAllShapes(getShapesMap(doc)).find((s) => s.id === editingId);
    const text = getNoteText(doc, editingId);
    if (note && note.type === "note" && text) {
      const b = shapeBounds(note);
      const tl = worldToScreen(viewport, b.x, b.y);
      editor = (
        <StickyNoteEditor
          doc={doc}
          text={text}
          rect={{
            x: tl.x,
            y: tl.y,
            w: b.w * viewport.scale,
            h: b.h * viewport.scale,
          }}
          scale={viewport.scale}
          color={note.color}
          onClose={() => setEditingId(null)}
        />
      );
    }
  }

  const cursor =
    tool === "pen"
      ? "crosshair"
      : tool === "select"
        ? "default"
        : "copy";

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block touch-none"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={onPointerLeave}
        onDoubleClick={onDoubleClick}
      />
      {editor}
    </div>
  );
}

function localPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return { sx: clientX - rect.left, sy: clientY - rect.top };
}
