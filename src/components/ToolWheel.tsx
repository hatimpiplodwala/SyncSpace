"use client";

// Radial tool picker. Appears at a touch point after a long-press on the canvas.
// Tap a segment to switch tool; tap outside to dismiss.

import {
  MousePointer2,
  Pencil,
  StickyNote,
  Square,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { TOOLS, type Tool } from "@/lib/canvas/tools";
import { cn } from "@/lib/utils";

const TOOL_ICONS: Record<Tool, LucideIcon> = {
  select: MousePointer2,
  pen: Pencil,
  note: StickyNote,
  rect: Square,
  ellipse: Circle,
};

const RADIUS = 64; // px from center to each button's center
const BUTTON = 48; // size-12

export function ToolWheel({
  position,
  active,
  onSelect,
  onDismiss,
}: {
  position: { x: number; y: number };
  active: Tool;
  onSelect: (t: Tool) => void;
  onDismiss: () => void;
}) {
  return (
    <>
      {/* Backdrop catches any pointer outside the segments. */}
      <div
        aria-hidden
        className="pointer-events-auto fixed inset-0 z-40"
        onPointerDown={onDismiss}
      />
      <div
        role="menu"
        aria-label="Tool picker"
        className="pointer-events-none absolute z-50"
        style={{ left: position.x, top: position.y }}
      >
        {TOOLS.map((t, i) => {
          // Even spacing around a circle, starting from straight up.
          const angle = (i / TOOLS.length) * Math.PI * 2 - Math.PI / 2;
          const dx = Math.cos(angle) * RADIUS;
          const dy = Math.sin(angle) * RADIUS;
          const Icon = TOOL_ICONS[t.tool];
          const isActive = t.tool === active;
          return (
            <button
              key={t.tool}
              type="button"
              role="menuitem"
              aria-label={t.label}
              suppressHydrationWarning
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(t.tool);
              }}
              className={cn(
                "glass pointer-events-auto absolute flex size-12 items-center justify-center rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring/40",
                isActive
                  ? "gloss-primary"
                  : "text-foreground hover:scale-110",
              )}
              style={{
                transform: `translate(${dx - BUTTON / 2}px, ${dy - BUTTON / 2}px)`,
              }}
            >
              <Icon className="size-5" />
            </button>
          );
        })}
      </div>
    </>
  );
}
