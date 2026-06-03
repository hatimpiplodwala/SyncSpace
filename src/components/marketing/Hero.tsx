import { AuthForm } from "@/components/AuthForm";
import { LiveDemo } from "./LiveDemo";

const SPECS: [string, string][] = [
  ["Sync", "Yjs CRDT"],
  ["Transport", "Supabase Realtime"],
  ["Storage", "Postgres + RLS"],
  ["Offline", "IndexedDB cache"],
];

export function Hero() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 pt-20 pb-16 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          {/* Headline column */}
          <div>
            <p className="label-mono">
              Real-time / CRDT-synced / Offline-capable
            </p>
            <h1 className="mt-6 font-display text-5xl font-medium leading-[0.98] tracking-tight text-foreground sm:text-6xl">
              Whiteboard together,
              <br />
              <em className="font-normal italic text-primary">in real time.</em>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">
              A multiplayer canvas where every stroke, sticky note, and shape
              merges instantly across the room — and keeps working after you go
              offline.
            </p>
            <div className="mt-9 max-w-md">
              <AuthForm />
            </div>
          </div>

          {/* Spec sheet */}
          <dl className="hidden self-end border-l border-border pl-6 lg:block">
            {SPECS.map(([k, v], i) => (
              <div
                key={k}
                className={`flex items-baseline justify-between gap-6 py-3 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <dt className="label-mono">{k}</dt>
                <dd className="font-mono text-sm text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Figure plate */}
        <figure className="border-t border-border pt-8 pb-20">
          <LiveDemo />
          <figcaption className="label-mono mt-3">
            fig.01 — a shared canvas, mid-session
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
