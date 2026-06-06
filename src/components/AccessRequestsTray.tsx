"use client";

import { useState, useTransition } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  approveRequest,
  denyRequest,
  listAccessRequests,
  type RequestRow,
} from "@/app/r/[roomId]/actions";

export function AccessRequestsTray({
  roomId,
  initialCount,
}: {
  roomId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const reload = () => {
    startTransition(async () => {
      const next = await listAccessRequests(roomId);
      setRows(next);
      setCount(next.length);
    });
  };

  const onOpenChange = (open: boolean) => {
    if (open) {
      setError(null);
      reload();
    }
  };

  const act = (
    fn: (roomId: string, userId: string) => Promise<{ error?: string }>,
    userId: string,
  ) => {
    setError(null);
    setBusyId(userId);
    startTransition(async () => {
      const res = await fn(roomId, userId);
      setBusyId(null);
      if (res.error) setError(res.error);
      else {
        const next = await listAccessRequests(roomId);
        setRows(next);
        setCount(next.length);
      }
    });
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Access requests"
          className="relative"
        >
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">Requests</span>
          {count > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Access requests</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {error && (
          <p className="px-2.5 py-2 text-sm text-destructive">{error}</p>
        )}

        {rows === null ? (
          <p className="px-2.5 py-3 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-2.5 py-3 text-sm text-muted-foreground">
            No pending requests.
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {rows.map((r) => (
              <li
                key={r.userId}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
              >
                <Avatar className="size-7">
                  <AvatarFallback
                    className="text-xs text-white"
                    style={{ backgroundColor: r.color }}
                  >
                    {r.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {r.name}
                </span>
                <Button
                  type="button"
                  size="icon"
                  className="size-7"
                  onClick={() => act(approveRequest, r.userId)}
                  disabled={busyId === r.userId}
                  aria-label={`Approve ${r.name}`}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => act(denyRequest, r.userId)}
                  disabled={busyId === r.userId}
                  aria-label={`Deny ${r.name}`}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
