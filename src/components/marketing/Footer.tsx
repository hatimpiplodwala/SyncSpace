const STACK = ["Yjs", "Supabase", "Postgres", "Next.js"];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-display text-base font-medium text-foreground">
            SyncSpace
          </span>
          <span className="label-mono">A real-time collaborative whiteboard</span>
        </div>
        <ul className="flex flex-wrap items-center gap-2">
          {STACK.map((s) => (
            <li
              key={s}
              className="border border-border px-2 py-1 font-mono text-[0.6875rem] text-muted-foreground transition-colors duration-[var(--dur-fast)] hover:border-foreground/30 hover:text-foreground"
            >
              {s}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
