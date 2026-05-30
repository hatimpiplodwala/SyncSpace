import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Logo size={22} />
          SyncSpace
        </div>
        <p>
          A real-time collaborative whiteboard demo · Next.js · Supabase · Yjs
        </p>
      </div>
    </footer>
  );
}
