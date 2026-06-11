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
import { ShareDialog } from "@/components/ShareDialog";
import { AccessRequestsTray } from "@/components/AccessRequestsTray";
import { RoomSettingsDialog } from "@/components/RoomSettingsDialog";
import { RequestAccessButton } from "@/components/RequestAccessButton";
import { JoinWithTokenButton } from "@/components/JoinWithTokenButton";
import { RoomCommands } from "@/components/RoomCommands";

// Suppress Referer for subresources/outbound links so a visited /r/[roomId]?t=token URL
// doesn't leak the invite token to fonts, images, analytics, or any link the user clicks.
export const metadata = {
  referrer: "no-referrer" as const,
};

type RoomRow = Pick<
  Room,
  "id" | "name" | "owner_id" | "deleted_at" | "invite_token"
>;

// Room page: gate access via RLS, handle invite-token joins, then render the canvas.
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { roomId } = await params;
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : undefined;

  const { user, profile } = await getAuthContext();
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");

  const supabase = await createClient();

  const fetchRoom = async () =>
    (
      await supabase
        .from("rooms")
        .select("id, name, owner_id, deleted_at, invite_token")
        .eq("id", roomId)
        .maybeSingle<RoomRow>()
    ).data;

  // RLS hides rooms the user isn't a member of, so a null row == no access.
  const room = await fetchRoom();

  // Already a member but the URL still carries the token: strip it from the address bar
  // and history so the token doesn't sit around in browser state.
  if (room && token) redirect(`/r/${roomId}`);

  if (!room) {
    const { data: reqRow } = await supabase
      .from("room_access_requests")
      .select("status")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle<{ status: string }>();
    const initialStatus =
      reqRow?.status === "pending"
        ? "pending"
        : reqRow?.status === "denied"
          ? "denied"
          : "none";

    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-foreground">
          You don&apos;t have access to this board
        </h1>
        {token ? (
          <>
            <p className="max-w-sm text-sm text-muted-foreground">
              You have an invite link. Join the board to start collaborating.
            </p>
            <JoinWithTokenButton roomId={roomId} token={token} />
          </>
        ) : (
          <>
            <p className="max-w-sm text-sm text-muted-foreground">
              Ask the owner for an invite link, or request access and they can
              let you in.
            </p>
            <RequestAccessButton roomId={roomId} initialStatus={initialStatus} />
          </>
        )}
        <Button asChild variant="ghost" size="sm" className="mt-2">
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

  const isOwner = room.owner_id === user.id;

  let pendingCount = 0;
  if (isOwner) {
    const { count } = await supabase
      .from("room_access_requests")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden overscroll-none">
      <header className="z-30 flex items-center justify-between gap-3 bg-background px-4 py-4 shadow-[var(--shadow-soft)] sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="Back to boards"
            className="group/back flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-[var(--dur-fast)] hover:text-foreground"
          >
            <ArrowLeft className="size-4 transition-transform duration-[var(--dur-fast)] [transition-timing-function:var(--ease-editorial)] group-hover/back:-translate-x-0.5" />
            <span className="hover-underline hidden sm:inline">Boards</span>
          </Link>
          <span className="hidden h-5 w-px shrink-0 bg-border sm:inline-block" aria-hidden />
          <Logo size={20} className="hidden shrink-0 sm:block" />
          <h1 className="truncate font-semibold text-foreground">
            {room.name}
          </h1>
        </div>

        {isOwner && (
          <div className="flex shrink-0 items-center gap-2">
            <AccessRequestsTray roomId={room.id} initialCount={pendingCount} />
            <ShareDialog roomId={room.id} inviteToken={room.invite_token} />
            <RoomSettingsDialog
              roomId={room.id}
              currentName={room.name}
              currentUserId={user.id}
            />
          </div>
        )}
      </header>
      <Whiteboard
        roomId={room.id}
        me={{
          id: user.id,
          name: profile.display_name,
          color: profile.avatar_color || userColor(user.id),
        }}
      />
      <RoomCommands
        roomId={room.id}
        inviteToken={room.invite_token}
        isOwner={isOwner}
      />
    </main>
  );
}
