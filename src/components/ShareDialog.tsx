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
        <Button variant="outline" size="sm" aria-label="Share board">
          <Link2 className="size-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[4px] gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-5">
          <DialogTitle className="font-display text-xl font-medium tracking-tight">
            Share this board
          </DialogTitle>
          <DialogDescription>
            Anyone signed in who opens this link joins as an editor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 px-6 py-4">
          <p className="label-mono">Invite link</p>
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
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex flex-col gap-1">
            <p className="label-mono">Regenerate</p>
            <p className="text-xs text-muted-foreground">
              The current link stops working.
            </p>
          </div>
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

        {error && (
          <p className="border-t border-border px-6 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
