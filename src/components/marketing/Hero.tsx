import { AuthForm } from "@/components/AuthForm";
import { LiveDemo } from "./LiveDemo";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pt-20 pb-16 lg:grid-cols-2 lg:items-center lg:gap-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Real-time · CRDT-synced · works offline
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Whiteboard together,
            <br />
            in real time.
          </h1>
          <p className="mt-4 max-w-md text-lg text-gray-600">
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
