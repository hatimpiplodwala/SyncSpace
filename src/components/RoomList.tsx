import Link from "next/link";
import type { Room } from "@/types/db";

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
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <p className="text-sm text-gray-600">
          You don&apos;t have any boards yet.
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Create your first board above to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <li key={room.id}>
          <Link
            href={`/r/${room.id}`}
            className="group block h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">
                {room.name}
              </h3>
              <span
                className={
                  room.owner_id === currentUserId
                    ? "rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                }
              >
                {room.owner_id === currentUserId ? "Owner" : "Member"}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Created {new Date(room.created_at).toLocaleDateString()}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
