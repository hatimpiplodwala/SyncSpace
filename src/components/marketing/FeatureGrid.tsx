const features = [
  {
    title: "Live presence",
    body: "See everyone's cursor, name, and color move in real time — accurate at any zoom level.",
  },
  {
    title: "Conflict-free editing",
    body: "Concurrent edits merge deterministically with CRDTs. No locks, no lost work, no server-side merge logic.",
  },
  {
    title: "Works offline",
    body: "Keep drawing with no connection. Changes queue locally and reconcile automatically when you reconnect.",
  },
  {
    title: "Share in a click",
    body: "Send a tokenized invite link. Revoke access any time by regenerating it.",
  },
];

export function FeatureGrid() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <p className="label-mono">What it does</p>
            <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground">
              A focused toolset built on distributed-systems fundamentals.
            </h2>
          </div>

          <ol className="border-t border-border">
            {features.map((f, i) => (
              <li
                key={f.title}
                className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 border-b border-border py-7"
              >
                <span className="label-mono pt-1 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-xl font-medium text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
