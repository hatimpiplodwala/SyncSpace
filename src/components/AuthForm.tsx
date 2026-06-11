"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
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
        className="rise rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground"
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
          className="group h-11 sm:h-10"
        >
          {isPending ? (
            "Sending…"
          ) : (
            <>
              Send magic link
              {/* On hover the arrow advances off the right edge while a fresh one
                  slides in from the left — a continuous "send" motion. */}
              <span className="relative inline-flex size-4 overflow-hidden" aria-hidden>
                <ArrowRight className="size-4 transition-transform duration-[var(--dur-base)] [transition-timing-function:var(--ease-editorial)] group-hover:translate-x-5" />
                <ArrowRight className="absolute inset-0 size-4 -translate-x-5 transition-transform duration-[var(--dur-base)] [transition-timing-function:var(--ease-editorial)] group-hover:translate-x-0" />
              </span>
            </>
          )}
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
