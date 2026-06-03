import Link from "next/link";
import type { Room } from "@/types/db";
import { Badge } from "@/components/ui/badge";

type RoomListItem = Pick<Room, "id" | "name" | "owner_id" | "created_at">;

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
    <ul className="border-t border-border">
      {rooms.map((room) => {
        const isOwner = room.owner_id === currentUserId;
        return (
          <li key={room.id} className="border-b border-border">
            <Link
              href={`/r/${room.id}`}
              className="group flex items-center justify-between gap-4 py-4 transition-colors hover:bg-foreground/[0.02]"
            >
              <div className="flex min-w-0 items-baseline gap-4 pl-3">
                <h3 className="truncate font-display text-lg font-medium text-foreground">
                  {room.name}
                </h3>
                <span className="label-mono shrink-0">
                  {new Date(room.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-4 pr-3">
                <Badge variant={isOwner ? "default" : "outline"}>
                  {isOwner ? "Owner" : "Member"}
                </Badge>
                <span
                  aria-hidden
                  className="font-mono text-sm text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                >
                  &rarr;
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
