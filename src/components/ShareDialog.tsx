"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { regenerateInviteToken } from "@/app/r/[roomId]/actions";

export function ShareDialog({
  roomId,
  inviteToken,
}: {
  roomId: string;
  inviteToken: string;
}) {
  const [token, setToken] = useState(inviteToken);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Build the absolute URL after mount to avoid a hydration mismatch on window.location.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);

  const url = origin ? `${origin}/r/${roomId}?t=${token}` : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy — select the link and copy manually.");
    }
  };

  const regenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await regenerateInviteToken(roomId);
      if (res.error) setError(res.error);
      else if (res.token) {
        setToken(res.token);
        setCopied(false);
      }
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="size-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this board</DialogTitle>
          <DialogDescription>
            Anyone signed in who opens this link joins as an editor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input readOnly value={url} aria-label="Invite link" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copy}
            aria-label="Copy link"
          >
            {copied ? (
              <Check className="size-4 text-primary" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Regenerating makes the current link stop working.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={regenerate}
            disabled={pending}
          >
            <RefreshCw className="size-4" />
            Regenerate
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
