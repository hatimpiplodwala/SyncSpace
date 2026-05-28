import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/types/db";

// Phase 1 placeholder. The interactive canvas (CanvasLayer, Toolbar, presence,
// realtime) is built in Phases 2–4 and will replace this stub.
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
        <h1 className="text-xl font-bold text-gray-900">No access to this board</h1>
        <p className="max-w-sm text-sm text-gray-500">
          You&apos;re not a member of this board. (The invite-link &amp;
          request-access flow lands in Phase 6.)
        </p>
        <Link href="/" className="text-sm font-medium text-gray-900 underline">
          Back to your boards
        </Link>
      </main>
    );
  }

  if (room.deleted_at) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">This board was deleted</h1>
        <Link href="/" className="text-sm font-medium text-gray-900 underline">
          Back to your boards
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← Boards
          </Link>
          <h1 className="font-semibold text-gray-900">{room.name}</h1>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
          Phase 1 · canvas coming soon
        </span>
      </header>
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            The collaborative canvas for{" "}
            <span className="font-medium text-gray-700">{room.name}</span> will
            be built in Phase 2.
          </p>
        </div>
      </div>
    </main>
  );
}
