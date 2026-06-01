// Decorative CSS-animated canvas preview: two cursors drifting over a few shapes.

export function LiveDemo() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-glossy)]">
      {/* dotted canvas backdrop */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* shapes */}
      <div className="absolute left-[14%] top-[20%] h-20 w-28 rotate-[-4deg] rounded-md bg-yellow-200 shadow-sm" />
      <div className="absolute right-[16%] top-[30%] h-16 w-24 rounded-lg border-2 border-blue-500" />
      <div className="absolute bottom-[18%] left-[28%] h-16 w-16 rounded-full border-2 border-sky-500" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 75"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M20 55 Q35 35 50 50 T80 40"
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>

      {/* roving cursors */}
      <Cursor className="animate-[demoA_7s_ease-in-out_infinite]" color="#2563eb" name="Ada" />
      <Cursor className="animate-[demoB_9s_ease-in-out_infinite]" color="#0ea5e9" name="Lin" />

      <style>{`
        @keyframes demoA {
          0%   { transform: translate(20px, 140px); }
          30%  { transform: translate(150px, 60px); }
          60%  { transform: translate(90px, 180px); }
          100% { transform: translate(20px, 140px); }
        }
        @keyframes demoB {
          0%   { transform: translate(260px, 60px); }
          35%  { transform: translate(120px, 150px); }
          70%  { transform: translate(280px, 200px); }
          100% { transform: translate(260px, 60px); }
        }
      `}</style>
    </div>
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
    <div className={`absolute left-0 top-0 ${className}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 2l6 16 2.5-6.5L19 9 4 2z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      <span
        className="ml-3 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  );
}
