import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import type { Room } from "@/types/db";
import { userColor } from "@/lib/colors";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Whiteboard } from "@/components/Whiteboard";

// Realtime collaborative canvas: local Yjs + IndexedDB, synced over Supabase
// (doc updates) with a separate presence channel for multi-user cursors.
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const { user, profile } = await getAuthContext();
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");

  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, owner_id, deleted_at")
    .eq("id", roomId)
    .maybeSingle<Pick<Room, "id" | "name" | "owner_id" | "deleted_at">>();

  // RLS hides rooms the user isn't a member of, so a null row == no access.
  if (!room) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-bold text-foreground">
          No access to this board
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You&apos;re not a member of this board. (The invite-link &amp;
          request-access flow lands in Phase 6.)
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/">Back to your boards</Link>
        </Button>
      </main>
    );
  }

  if (room.deleted_at) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-bold text-foreground">
          This board was deleted
        </h1>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/">Back to your boards</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden overscroll-none">
      <header className="z-30 flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Boards
          </Link>
          <span className="h-5 w-px shrink-0 bg-border" aria-hidden />
          <Logo size={20} className="shrink-0" />
          <h1 className="truncate font-semibold text-foreground">{room.name}</h1>
        </div>
      </header>
      <Whiteboard
        roomId={room.id}
        me={{
          id: user.id,
          name: profile.display_name,
          color: profile.avatar_color || userColor(user.id),
        }}
      />
    </main>
  );
}
