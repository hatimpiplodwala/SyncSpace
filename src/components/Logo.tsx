// SyncSpace logomark: two overlapping rounded squares (blue + sky) whose
// intersection lightens — a visual nod to two people's edits merging (CRDT).

import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="SyncSpace"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="ss-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="ss-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
        <clipPath id="ss-back">
          <rect x="2.5" y="2.5" width="17" height="17" rx="5.5" />
        </clipPath>
      </defs>
      <rect
        x="2.5"
        y="2.5"
        width="17"
        height="17"
        rx="5.5"
        fill="url(#ss-blue)"
      />
      <rect
        x="12.5"
        y="12.5"
        width="17"
        height="17"
        rx="5.5"
        fill="url(#ss-sky)"
      />
      <g clipPath="url(#ss-back)">
        <rect
          x="12.5"
          y="12.5"
          width="17"
          height="17"
          rx="5.5"
          fill="#bae6fd"
        />
      </g>
    </svg>
  );
}

/** Logo + wordmark lockup used in headers. */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-lg font-bold tracking-tight text-foreground",
        className,
      )}
    >
      <Logo size={26} />
      SyncSpace
    </span>
  );
}
