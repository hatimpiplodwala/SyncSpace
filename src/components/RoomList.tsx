import Link from "next/link";
import type { Room } from "@/types/db";

type RoomListItem = Pick<Room, "id" | "name" | "owner_id" | "created_at">;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Editorial spec-sheet table: hairline rules, mono headers, no card chrome.
export function RoomList({
  rooms,
  currentUserId,
}: {
  rooms: RoomListItem[];
  currentUserId: string;
}) {
  if (rooms.length === 0) {
    return (
      <div className="border border-dashed border-border px-6 py-16 text-center">
        <p className="font-display text-lg text-foreground">No boards yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first board above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-6 border-b border-border px-3 py-2 sm:grid-cols-[1fr_8rem_5rem_1rem]">
        <span className="label-mono">Name</span>
        <span className="label-mono hidden sm:block">Created</span>
        <span className="label-mono">Role</span>
        <span className="sr-only sm:not-sr-only sm:block" aria-hidden />
      </div>

      <ul>
        {rooms.map((room) => {
          const isOwner = room.owner_id === currentUserId;
          return (
            <li
              key={room.id}
              className="group/row relative border-b border-border"
            >
              {/* left accent hairline that draws in on hover, matching the feature list */}
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-px origin-top scale-y-0 bg-primary transition-transform duration-[var(--dur-base)] [transition-timing-function:var(--ease-editorial)] group-hover/row:scale-y-100"
              />
              <Link
                href={`/r/${room.id}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-6 px-3 py-4 transition-colors duration-[var(--dur-fast)] hover:bg-secondary/50 sm:grid-cols-[1fr_8rem_5rem_1rem]"
              >
                <h3 className="truncate font-display text-lg font-medium text-foreground">
                  {room.name}
                </h3>
                <span className="label-mono hidden whitespace-nowrap sm:block">
                  {formatDate(room.created_at)}
                </span>
                <span className="label-mono whitespace-nowrap transition-colors duration-[var(--dur-fast)] group-hover/row:text-foreground">
                  {isOwner ? "Owner" : "Member"}
                </span>
                <span
                  aria-hidden
                  className="hidden font-mono text-sm text-muted-foreground transition-transform duration-[var(--dur-fast)] [transition-timing-function:var(--ease-editorial)] group-hover/row:translate-x-0.5 group-hover/row:text-primary sm:inline"
                >
                  &rarr;
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
