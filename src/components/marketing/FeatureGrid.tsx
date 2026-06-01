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
      <div className="mx-auto max-w-5xl px-6 py-24">
        <p className="text-center text-sm font-medium text-primary">How it works</p>
        <h2 className="mx-auto mt-3 max-w-xl text-center text-3xl font-bold tracking-tight text-foreground">
          A focused toolset built on distributed-systems fundamentals
        </h2>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
