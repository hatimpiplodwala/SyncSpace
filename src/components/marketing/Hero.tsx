import { AuthForm } from "@/components/AuthForm";
import { Badge } from "@/components/ui/badge";
import { LiveDemo } from "./LiveDemo";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft blue aura behind the hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pt-20 pb-16 lg:grid-cols-2 lg:items-center lg:gap-8">
        <div>
          <Badge
            variant="outline"
            className="gap-2 px-3 py-1 text-muted-foreground shadow-[var(--shadow-soft)]"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            Real-time · CRDT-synced · works offline
          </Badge>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Whiteboard together,
            <br />
            <span className="bg-[var(--gradient-brand)] bg-clip-text text-transparent">
              in real time.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            SyncSpace is a multiplayer canvas where every stroke, sticky note,
            and shape merges instantly across everyone in the room — even after
            you go offline.
          </p>
          <div className="mt-8 max-w-md">
            <AuthForm />
          </div>
        </div>
        <div className="lg:pl-6">
          <LiveDemo />
        </div>
      </div>
    </section>
  );
}
