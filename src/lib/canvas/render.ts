// Pure renderer: draws shapes through the viewport transform onto a 2D context (dpr baked in).

import type { Shape } from "@/types/shapes";
import { shapeBounds } from "@/types/shapes";
import { NOTE_INK } from "@/lib/colors";
import { type Viewport, worldToScreen } from "./viewport";

// Side length (screen px) of the bottom-right drag-to-resize handle.
export const RESIZE_HANDLE = 12;

const NOTE_PADDING = 12;
const NOTE_LINE_HEIGHT = 20;
const NOTE_FONT = "15px ui-sans-serif, system-ui, sans-serif";

/** Screen-space rect of a shape's resize handle (null for pen / unresizable). */
export function resizeHandleScreenRect(
  shape: Shape,
  vp: Viewport,
): { x: number; y: number; w: number; h: number } | null {
  if (shape.type === "pen") return null;
  const b = shapeBounds(shape);
  const br = worldToScreen(vp, b.x + b.w, b.y + b.h);
  return {
    x: br.x - RESIZE_HANDLE / 2,
    y: br.y - RESIZE_HANDLE / 2,
    w: RESIZE_HANDLE,
    h: RESIZE_HANDLE,
  };
}

export type RenderOptions = {
  width: number; // CSS pixels
  height: number; // CSS pixels
  dpr: number;
  selectedId: string | null;
  // Optional in-progress shape drawn on top (live preview while creating).
  preview?: Shape | null;
  // Hide the note currently being edited (the HTML editor overlay shows it).
  hideTextForId?: string | null;
};

const DOT_SPACING = 24; // world units between background dots

export function render(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  vp: Viewport,
  opts: RenderOptions,
): void {
  const { dpr } = opts;

  // Clear the backing store.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, opts.width * dpr, opts.height * dpr);

  // Background dot grid (screen space).
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawDotGrid(ctx, vp, opts.width, opts.height);

  // Shapes (world space).
  ctx.setTransform(
    vp.scale * dpr,
    0,
    0,
    vp.scale * dpr,
    vp.offsetX * dpr,
    vp.offsetY * dpr,
  );
  const ordered = [...shapes].sort((a, b) => a.z - b.z);
  for (const shape of ordered) {
    drawShape(ctx, shape, opts.hideTextForId === shape.id);
  }
  if (opts.preview) drawShape(ctx, opts.preview, false);

  // Selection outline (screen space — crisp regardless of zoom).
  if (opts.selectedId) {
    const sel = shapes.find((s) => s.id === opts.selectedId);
    if (sel) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSelection(ctx, sel, vp);
    }
  }
}

function drawDotGrid(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  width: number,
  height: number,
): void {
  const step = DOT_SPACING * vp.scale;
  if (step < 8) return; // too dense to be useful when zoomed far out
  const startX = ((vp.offsetX % step) + step) % step;
  const startY = ((vp.offsetY % step) + step) % step;
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  const r = Math.min(1.5, step / 16);
  for (let x = startX; x < width; x += step) {
    for (let y = startY; y < height; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  hideText: boolean,
): void {
  switch (shape.type) {
    case "pen": {
      const pts = shape.points;
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts[i], pts[i + 1]);
      }
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      return;
    }
    case "rect": {
      const { x, y, w, h } = normalize(shape);
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      return;
    }
    case "ellipse": {
      const { x, y, w, h } = normalize(shape);
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fill();
      }
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }
    case "note": {
      const { x, y, w, h } = normalize(shape);
      // Card with a soft drop shadow.
      ctx.save();
      ctx.fillStyle = shape.color;
      ctx.shadowColor = "rgba(15,23,42,0.18)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      roundRect(ctx, x, y, w, h, 10);
      ctx.fill();
      ctx.restore();
      // Subtle inner top highlight for a little depth (no shadow).
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      roundRect(ctx, x, y, w, Math.min(10, h), 10);
      ctx.fill();
      ctx.restore();

      if (!hideText) {
        ctx.textBaseline = "top";
        ctx.font = NOTE_FONT;
        if (shape.text) {
          ctx.fillStyle = NOTE_INK;
          wrapText(
            ctx,
            shape.text,
            x + NOTE_PADDING,
            y + NOTE_PADDING,
            w - NOTE_PADDING * 2,
            NOTE_LINE_HEIGHT,
          );
        } else {
          ctx.fillStyle = "rgba(31,41,55,0.35)";
          ctx.fillText("Type…", x + NOTE_PADDING, y + NOTE_PADDING);
        }
      }
      return;
    }
  }
}

function drawSelection(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  vp: Viewport,
): void {
  const b = shapeBounds(shape);
  const pad = 4;
  const x = b.x * vp.scale + vp.offsetX - pad;
  const y = b.y * vp.scale + vp.offsetY - pad;
  const w = b.w * vp.scale + pad * 2;
  const h = b.h * vp.scale + pad * 2;
  ctx.save();
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();

  // Bottom-right resize handle (box shapes only).
  const handle = resizeHandleScreenRect(shape, vp);
  if (handle) {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(handle.x, handle.y, handle.w, handle.h);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// --- helpers ----------------------------------------------------------------

function normalize(s: { x: number; y: number; w: number; h: number }) {
  return {
    x: s.w < 0 ? s.x + s.w : s.x,
    y: s.h < 0 ? s.y + s.h : s.y,
    w: Math.abs(s.w),
    h: Math.abs(s.h),
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const paragraphs = text.split("\n");
  let cursorY = y;
  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        line = word;
        cursorY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }
  }
}
