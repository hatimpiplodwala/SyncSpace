"use client";

// Mono zoom pill in the bottom-right corner (laptop only). Calls into the
// CanvasLayer's exposed controls via a callback ref.

import { Minus, Plus, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type CanvasControls = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToContent: () => void;
};

export function ZoomControls({
  scale,
  controlsRef,
}: {
  scale: number;
  controlsRef: React.RefObject<CanvasControls | null>;
}) {
  return (
    <div className="glass pointer-events-auto absolute bottom-9 right-4 z-20 hidden items-center rounded-[4px] p-0.5 md:flex">
      <PillButton
        aria-label="Zoom out"
        onClick={() => controlsRef.current?.zoomOut()}
      >
        <Minus className="size-3.5" />
      </PillButton>
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => controlsRef.current?.resetZoom()}
        aria-label="Reset zoom to 100%"
        className="label-mono px-2 py-1 transition-colors hover:text-foreground"
      >
        {Math.round(scale * 100)}%
      </button>
      <PillButton
        aria-label="Zoom in"
        onClick={() => controlsRef.current?.zoomIn()}
      >
        <Plus className="size-3.5" />
      </PillButton>
      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
      <PillButton
        aria-label="Fit to content"
        onClick={() => controlsRef.current?.fitToContent()}
      >
        <Maximize2 className="size-3.5" />
      </PillButton>
    </div>
  );
}

function PillButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      suppressHydrationWarning
      className={cn(
        "flex size-7 items-center justify-center rounded-[3px] text-foreground/70 outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
