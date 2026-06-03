// SyncSpace logomark: two overlapping squares whose intersection is inked (edits merging).

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
      {/* intersection of the two squares, inked in the accent */}
      <rect x="12.5" y="12.5" width="7" height="7" fill="var(--primary)" />
      <rect
        x="3.5"
        y="3.5"
        width="16"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="12.5"
        y="12.5"
        width="16"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

/** Logo + wordmark lockup used in headers. */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display text-lg font-medium tracking-tight text-foreground",
        className,
      )}
    >
      <Logo size={20} className="text-foreground" />
      SyncSpace
    </span>
  );
}
