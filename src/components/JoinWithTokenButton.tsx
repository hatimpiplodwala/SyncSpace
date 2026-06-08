"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { joinWithToken } from "@/app/r/[roomId]/actions";

export function JoinWithTokenButton({
  roomId,
  token,
}: {
  roomId: string;
  token: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const join = () => {
    setError(null);
    startTransition(async () => {
      const res = await joinWithToken(roomId, token);
      if (res?.error) setError(res.error);
      // Success redirects server-side; no state to set.
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" onClick={join} disabled={pending}>
        Join board
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
