"use client";

// Editorial IDE-style status bar pinned along the canvas bottom (laptop only).

import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "./ConnectionBadge";

const STATUS: Record<ConnectionStatus, { label: string; dot: string }> = {
  live: { label: "LIVE", dot: "bg-primary" },
  loading: { label: "LOADING", dot: "bg-muted-foreground" },
  local: { label: "LOCAL", dot: "bg-primary" },
  reconnecting: { label: "RECONNECTING", dot: "bg-amber-500" },
  offline: { label: "OFFLINE", dot: "bg-muted-foreground" },
};

export function StatusLine({
  scale,
  shapeCount,
  peerCount,
  status,
}: {
  scale: number;
  shapeCount: number;
  peerCount: number;
  status: ConnectionStatus;
}) {
  const s = STATUS[status];
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 hidden border-t border-border bg-card/80 backdrop-blur-sm md:flex">
      <div className="label-mono flex w-full items-center gap-3 px-4 py-1.5">
        <span>ZOOM {Math.round(scale * 100)}%</span>
        <Dot />
        <span>
          {shapeCount} SHAPE{shapeCount === 1 ? "" : "S"}
        </span>
        <Dot />
        <span>
          {peerCount} PEER{peerCount === 1 ? "" : "S"}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
          {s.label}
        </span>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span className="opacity-30" aria-hidden>
      ·
    </span>
  );
}
