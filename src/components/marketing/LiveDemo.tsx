// Editorial figure: a calm, composed snapshot of a shared canvas. Mostly static —
// only a quiet "live" indicator pulses and the cursors drift slowly.

export function LiveDemo() {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[3px] border border-border bg-card">
      {/* caption strip */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <span className="label-mono">shared-canvas.board</span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary [animation:pulseLive_2.4s_ease-in-out_infinite]" />
          <span className="label-mono">3 online</span>
        </span>
      </div>

      {/* canvas surface */}
      <div className="grid-paper absolute inset-0 top-9">
        {/* ink shapes */}
        <div className="absolute left-[12%] top-[22%] h-[28%] w-[22%] border border-foreground/45" />
        <div className="absolute right-[14%] top-[16%] aspect-square w-[15%] rounded-full border border-foreground/45" />

        {/* sticky note (muted ochre) */}
        <div
          className="absolute bottom-[16%] left-[30%] h-[26%] w-[20%] rotate-[-2deg] border border-foreground/10 p-2"
          style={{ backgroundColor: "oklch(0.95 0.09 100)" }}
        >
          <div className="h-1.5 w-3/4 bg-foreground/20" />
          <div className="mt-1.5 h-1.5 w-1/2 bg-foreground/15" />
        </div>

        {/* the single accent stroke */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 56"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M58 40 Q66 26 74 33 T90 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </svg>

        {/* labeled cursors */}
        <Cursor className="left-[26%] top-[34%] [animation:driftA_11s_ease-in-out_infinite]" name="Ada" />
        <Cursor className="left-[68%] top-[58%] [animation:driftB_13s_ease-in-out_infinite]" name="Lin" />
      </div>

      <style>{`
        @keyframes pulseLive { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes driftA {
          0%,100% { transform: translate(0,0); } 50% { transform: translate(10px,-7px); }
        }
        @keyframes driftB {
          0%,100% { transform: translate(0,0); } 50% { transform: translate(-9px,6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .grid-paper [class*="animation"],
          .size-1\\.5[class*="animation"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function Cursor({ className, name }: { className?: string; name: string }) {
  return (
    <div className={`pointer-events-none absolute ${className ?? ""}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 2l6 16 2.5-6.5L19 9 4 2z"
          fill="var(--foreground)"
          stroke="var(--card)"
          strokeWidth="1.5"
        />
      </svg>
      <span className="ml-2 inline-block border border-border bg-card px-1.5 py-0.5 font-mono text-[0.625rem] text-foreground">
        {name}
      </span>
    </div>
  );
}
