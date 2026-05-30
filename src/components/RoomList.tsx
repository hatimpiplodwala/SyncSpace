import Link from "next/link";
import type { Room } from "@/types/db";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
      <Card className="border-dashed bg-card/60 px-6 py-16 text-center shadow-none">
        <p className="text-sm text-foreground">
          You don&apos;t have any boards yet.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first board above to get started.
        </p>
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => {
        const isOwner = room.owner_id === currentUserId;
        return (
          <li key={room.id}>
            <Link href={`/r/${room.id}`} className="group block h-full">
              <Card className="h-full gap-2 p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-glossy)]">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{room.name}</h3>
                  <Badge variant={isOwner ? "default" : "muted"}>
                    {isOwner ? "Owner" : "Member"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(room.created_at).toLocaleDateString()}
                </p>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
