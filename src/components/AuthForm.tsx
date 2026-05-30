"use client";

import { useActionState } from "react";
import { sendMagicLink, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: FormState = {};

export function AuthForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(sendMagicLink, initial);

  if (state.sent) {
    return (
      <div
        role="status"
        className="rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground"
      >
        Check your inbox — we sent you a magic link to sign in.
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3"}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="h-11 flex-1 sm:h-10"
        />
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="h-11 sm:h-10"
        >
          {isPending ? "Sending…" : "Send magic link"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {!compact && (
        <p className="text-xs text-muted-foreground">
          No password needed — we&apos;ll email you a one-tap sign-in link.
        </p>
      )}
    </form>
  );
}
