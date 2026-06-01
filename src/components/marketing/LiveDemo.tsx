// Self-drawing canvas demo: cursors glide in and place a sticky note, a freehand
// stroke, and a shape on a loop — a calm impression of live collaboration.
// Pure CSS/SVG, server-rendered, and disabled under prefers-reduced-motion.

export function LiveDemo() {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-glossy)]">
      {/* window chrome */}
      <div className="absolute inset-x-0 top-0 z-20 flex h-9 items-center justify-between border-b border-border/70 bg-secondary/60 px-3 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-yellow-400/80" />
          <span className="size-2.5 rounded-full bg-green-400/80" />
        </div>
        <div className="flex -space-x-1.5">
          <Avatar color="#2563eb" letter="A" />
          <Avatar color="#0ea5e9" letter="L" />
          <span className="grid size-5 place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-semibold text-muted-foreground">
            +2
          </span>
        </div>
      </div>

      {/* canvas surface */}
      <div className="absolute inset-0 top-9">
        {/* dotted backdrop */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* sticky note — placed by Ada */}
        <div
          className="demo-el absolute left-[14%] top-[16%] h-[26%] w-[26%] rounded-md bg-yellow-200 shadow-sm [animation:demoSticky_9s_ease-in-out_infinite]"
          style={{ transformOrigin: "top left" }}
        >
          <div className="mt-3 ml-3 h-1.5 w-2/3 rounded-full bg-yellow-500/40" />
          <div className="mt-2 ml-3 h-1.5 w-1/2 rounded-full bg-yellow-500/30" />
        </div>

        {/* freehand stroke — drawn by Lin */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 62.5"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="demo-stroke [animation:demoDraw_9s_ease-in-out_infinite]"
            d="M26 44 Q40 30 53 38 T78 30"
            pathLength={1}
            fill="none"
            stroke="#ef4444"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeDasharray={1}
          />
        </svg>

        {/* shape — pops in */}
        <div className="demo-el absolute bottom-[16%] left-[40%] aspect-square w-[16%] rounded-full border-2 border-sky-500 [animation:demoPop_9s_ease-in-out_infinite]" />

        {/* roving cursors */}
        <Cursor className="[animation:demoCursorA_9s_ease-in-out_infinite]" color="#2563eb" name="Ada" />
        <Cursor className="[animation:demoCursorB_9s_ease-in-out_infinite]" color="#0ea5e9" name="Lin" />
      </div>

      <style>{`
        @keyframes demoSticky {
          0%, 8%   { opacity: 0; transform: scale(0.8) rotate(-4deg); }
          15%      { opacity: 1; transform: scale(1) rotate(-4deg); }
          92%      { opacity: 1; transform: scale(1) rotate(-4deg); }
          100%     { opacity: 0; transform: scale(1) rotate(-4deg); }
        }
        @keyframes demoDraw {
          0%, 32%  { stroke-dashoffset: 1; opacity: 1; }
          52%      { stroke-dashoffset: 0; }
          92%      { stroke-dashoffset: 0; opacity: 1; }
          100%     { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes demoPop {
          0%, 60%  { opacity: 0; transform: scale(0.4); }
          68%      { opacity: 1; transform: scale(1.12); }
          74%      { transform: scale(1); }
          92%      { opacity: 1; }
          100%     { opacity: 0; transform: scale(1); }
        }
        @keyframes demoCursorA {
          0%   { left: 6%;  top: 78%; }
          15%  { left: 22%; top: 24%; }
          45%  { left: 58%; top: 42%; }
          68%  { left: 46%; top: 62%; }
          100% { left: 6%;  top: 78%; }
        }
        @keyframes demoCursorB {
          0%   { left: 88%; top: 14%; }
          32%  { left: 26%; top: 70%; }
          52%  { left: 78%; top: 48%; }
          74%  { left: 56%; top: 36%; }
          100% { left: 88%; top: 14%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .demo-el { opacity: 1 !important; transform: none !important; animation: none !important; }
          .demo-stroke { stroke-dashoffset: 0 !important; opacity: 1 !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function Avatar({ color, letter }: { color: string; letter: string }) {
  return (
    <span
      className="grid size-5 place-items-center rounded-full border-2 border-card text-[9px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {letter}
    </span>
  );
}

function Cursor({
  className,
  color,
  name,
}: {
  className?: string;
  color: string;
  name: string;
}) {
  return (
    <div className={`pointer-events-none absolute z-10 -translate-x-1 -translate-y-1 ${className}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 2l6 16 2.5-6.5L19 9 4 2z" fill={color} stroke="white" strokeWidth="1.5" />
      </svg>
      <span
        className="ml-3 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  );
}
