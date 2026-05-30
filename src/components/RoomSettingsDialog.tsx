"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  kickMember,
  listMembers,
  renameRoom,
  softDeleteRoom,
  type MemberRow,
} from "@/app/r/[roomId]/actions";

export function RoomSettingsDialog({
  roomId,
  currentName,
  currentUserId,
}: {
  roomId: string;
  currentName: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onOpenChange = (open: boolean) => {
    if (open) {
      setError(null);
      setConfirmDelete(false);
      startTransition(async () => setMembers(await listMembers(roomId)));
    }
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await renameRoom(roomId, name);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  const kick = (userId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await kickMember(roomId, userId);
      if (res.error) setError(res.error);
      else setMembers(await listMembers(roomId));
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const res = await softDeleteRoom(roomId);
      if (res.error) setError(res.error);
      else router.push("/");
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="size-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Board settings</DialogTitle>
        </DialogHeader>

        {/* Rename */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="room-name"
            className="text-sm font-medium text-foreground"
          >
            Name
          </label>
          <div className="flex gap-2">
            <Input
              id="room-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              type="button"
              onClick={save}
              disabled={pending || name.trim() === currentName.trim()}
            >
              Save
            </Button>
          </div>
        </div>

        {/* Members */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Members</span>
          {members === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center gap-2 py-1">
                  <Avatar className="size-7">
                    <AvatarFallback
                      className="text-xs text-white"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {m.name}
                    {m.userId === currentUserId && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
                  </span>
                  {m.role === "owner" ? (
                    <Badge variant="muted">Owner</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => kick(m.userId)}
                      disabled={pending}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Danger zone */}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Deleting hides this board for everyone.
          </p>
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={remove}
                disabled={pending}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
              Delete board
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
