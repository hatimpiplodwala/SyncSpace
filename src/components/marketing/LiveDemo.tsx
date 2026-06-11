"use client";

// Editorial figure of a shared canvas that stays quietly alive: two cursors drift
// as if working, and the accent stroke draws itself, holds, and redraws on a calm
// ~12s loop. Always running (no scroll trigger) so it never reads as a flat image.
// Reduced-motion collapses it to the composed still.

export function LiveDemo() {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[3px] border border-border bg-card">
      {/* caption strip */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <span className="label-mono">shared-canvas.board</span>
        <span className="flex items-center gap-1.5">
          <span className="ld-live size-1.5 rounded-full bg-primary" />
          <span className="label-mono">3 online</span>
        </span>
      </div>

      {/* canvas surface */}
      <div className="absolute inset-0 top-9">
        {/* grid texture, softly faded at the edges so it reads as an infinite canvas */}
        <div
          className="grid-paper absolute inset-0"
          style={{
            WebkitMaskImage:
              "radial-gradient(120% 120% at 50% 45%, #000 55%, transparent 100%)",
            maskImage:
              "radial-gradient(120% 120% at 50% 45%, #000 55%, transparent 100%)",
          }}
        />

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

        {/* the accent stroke — draws itself on a loop, as if Ada keeps sketching it */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 56"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="ld-stroke"
            d="M58 40 Q66 26 74 33 T90 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.4}
            strokeLinecap="round"
            pathLength={1}
          />
        </svg>

        {/* labeled cursors — continuous drift, Ada sweeps the stroke as it draws */}
        <Cursor className="ld-cursor-a left-[26%] top-[34%]" name="Ada" />
        <Cursor className="ld-cursor-b left-[68%] top-[58%]" name="Lin" />
      </div>

      <style>{`
        .ld-live { animation: ld-pulse 2.4s ease-in-out infinite; }

        .ld-stroke {
          stroke-dasharray: 1;
          animation: ld-draw 12s var(--ease-editorial) infinite;
        }
        @keyframes ld-draw {
          0%   { stroke-dashoffset: 1; opacity: 0; }
          4%   { stroke-dashoffset: 1; opacity: 1; }
          22%  { stroke-dashoffset: 0; opacity: 1; }
          88%  { stroke-dashoffset: 0; opacity: 1; }
          98%  { stroke-dashoffset: 0; opacity: 0; }
          100% { stroke-dashoffset: 1; opacity: 0; }
        }

        .ld-cursor-a { animation: ld-work-a 12s ease-in-out infinite; }
        .ld-cursor-b { animation: ld-work-b 14s ease-in-out infinite; }
        @keyframes ld-work-a {
          0%   { transform: translate(0, 0); }
          18%  { transform: translate(150px, 58px); }
          30%  { transform: translate(214px, 30px); }
          55%  { transform: translate(232px, 44px); }
          78%  { transform: translate(96px, 78px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes ld-work-b {
          0%   { transform: translate(0, 0); }
          26%  { transform: translate(-64px, -86px); }
          52%  { transform: translate(-30px, 24px); }
          74%  { transform: translate(48px, 40px); }
          100% { transform: translate(0, 0); }
        }

        @keyframes ld-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        @media (prefers-reduced-motion: reduce) {
          .ld-live, .ld-stroke, .ld-cursor-a, .ld-cursor-b {
            animation: none !important;
          }
          .ld-stroke { stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Cursor({ className, name }: { className?: string; name: string }) {
  return (
    <div className={`pointer-events-none absolute z-10 ${className ?? ""}`}>
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
