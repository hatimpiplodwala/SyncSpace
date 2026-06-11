"use client";

import { useInView } from "@/lib/useInView";

const features = [
  {
    title: "Live presence",
    tech: "Supabase Realtime",
    body: "See everyone's cursor, name, and color move in real time — accurate at any zoom level.",
  },
  {
    title: "Conflict-free editing",
    tech: "Yjs CRDT",
    body: "Concurrent edits merge deterministically with CRDTs. No locks, no lost work, no server-side merge logic.",
  },
  {
    title: "Works offline",
    tech: "IndexedDB cache",
    body: "Keep drawing with no connection. Changes queue locally and reconcile automatically when you reconnect.",
  },
  {
    title: "Share in a click",
    tech: "Tokenized links",
    body: "Send a tokenized invite link. Revoke access any time by regenerating it.",
  },
];

export function FeatureGrid() {
  const [listRef, inView] = useInView<HTMLOListElement>();

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="label-mono">What it does</p>
            <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground">
              A focused toolset built on distributed-systems fundamentals.
            </h2>
          </div>

          <ol ref={listRef} className="border-t border-border">
            {features.map((f, i) => (
              <li
                key={f.title}
                style={{ "--i": i } as React.CSSProperties}
                className={`rise-in-view group/feat relative border-b border-border ${
                  inView ? "is-inview" : ""
                }`}
              >
                {/* left accent hairline that draws in on hover */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-px origin-top scale-y-0 bg-primary transition-transform duration-[var(--dur-base)] [transition-timing-function:var(--ease-editorial)] group-hover/feat:scale-y-100"
                />
                <div className="grid grid-cols-[auto_1fr] gap-x-6 px-3 py-7 transition-colors duration-[var(--dur-fast)] group-hover/feat:bg-secondary/50">
                  <span className="label-mono pt-1.5 tabular-nums transition-colors duration-[var(--dur-fast)] group-hover/feat:text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-xl font-medium text-foreground">
                        {f.title}
                      </h3>
                      <span className="label-mono whitespace-nowrap transition-colors duration-[var(--dur-fast)] group-hover/feat:text-foreground">
                        {f.tech}
                      </span>
                    </div>
                    <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                      {f.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
