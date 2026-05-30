"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { requestAccess } from "@/app/r/[roomId]/actions";

type Status = "none" | "pending" | "denied";

export function RequestAccessButton({
  roomId,
  initialStatus,
}: {
  roomId: string;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status === "pending") {
    return (
      <p className="text-sm text-muted-foreground">
        Request sent — waiting for the owner to approve.
      </p>
    );
  }

  const request = () => {
    setError(null);
    startTransition(async () => {
      const res = await requestAccess(roomId);
      if (res.error) setError(res.error);
      else setStatus("pending");
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {status === "denied" && (
        <p className="text-sm text-muted-foreground">
          Your previous request was declined. You can ask again.
        </p>
      )}
      <Button type="button" onClick={request} disabled={pending}>
        Request access
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
