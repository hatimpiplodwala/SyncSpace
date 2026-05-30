import { Card } from "@/components/ui/card";

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
    <section className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          How it works
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
          A focused toolset built on distributed-systems fundamentals.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card
              key={f.title}
              className="gap-2 p-6 transition-shadow hover:shadow-[var(--shadow-glossy)]"
            >
              <h3 className="text-base font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
