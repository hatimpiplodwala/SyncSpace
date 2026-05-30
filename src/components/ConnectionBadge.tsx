"use client";

// Connection status indicator. "live" shows nothing (no banner when all is well,
// PRD §6); the other states surface a small frosted pill bottom-left.

import { cn } from "@/lib/utils";

export type ConnectionStatus =
  | "loading"
  | "local"
  | "live"
  | "reconnecting"
  | "offline";

const STYLES: Record<
  ConnectionStatus,
  { label: string; dot: string } | null
> = {
  live: null,
  loading: { label: "Loading…", dot: "bg-muted-foreground" },
  local: { label: "Saved on this device", dot: "bg-primary" },
  reconnecting: { label: "Reconnecting…", dot: "bg-amber-500" },
  offline: { label: "Offline — changes saved locally", dot: "bg-muted-foreground" },
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const style = STYLES[status];
  if (!style) return null;
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20">
      <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/80">
        <span className={cn("size-2 rounded-full", style.dot)} aria-hidden />
        {style.label}
      </span>
    </div>
  );
}
