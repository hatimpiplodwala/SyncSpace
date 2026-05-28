"use client";

// Connection status indicator. Phase 2 is single-user/local, so the only states
// are "loading" (hydrating from IndexedDB) and "local" (saved on this device).
// Phase 5 wires this to the realtime channel for Live / Reconnecting / Offline.

export type ConnectionStatus =
  | "loading"
  | "local"
  | "live"
  | "reconnecting"
  | "offline";

const STYLES: Record<
  ConnectionStatus,
  { label: string; className: string; dot: string } | null
> = {
  // "live" shows nothing (no banner when all is well — PRD §6).
  live: null,
  loading: {
    label: "Loading…",
    className: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  },
  local: {
    label: "Saved on this device",
    className: "bg-gray-100 text-gray-600",
    dot: "bg-emerald-500",
  },
  reconnecting: {
    label: "Reconnecting…",
    className: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  offline: {
    label: "Offline — changes saved locally",
    className: "bg-gray-200 text-gray-700",
    dot: "bg-gray-500",
  },
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const style = STYLES[status];
  if (!style) return null;
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ${style.className}`}
      >
        <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
        {style.label}
      </span>
    </div>
  );
}
