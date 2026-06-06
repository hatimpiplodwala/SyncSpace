"use client";

// Mobile-only connection pill (laptop uses the StatusLine instead). "live" shows nothing.

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
  loading: { label: "Loading", dot: "bg-muted-foreground" },
  local: { label: "Local — saved here", dot: "bg-primary" },
  reconnecting: { label: "Reconnecting", dot: "bg-amber-500" },
  offline: { label: "Offline — saved locally", dot: "bg-muted-foreground" },
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const style = STYLES[status];
  if (!style) return null;
  return (
    <div className="pointer-events-none absolute left-4 z-20 md:hidden bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)]">
      <span className="glass inline-flex items-center gap-2 rounded-[4px] px-3 py-1.5">
        <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
        <span className="label-mono">{style.label}</span>
      </span>
    </div>
  );
}
