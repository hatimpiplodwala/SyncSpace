"use client";

import { useActionState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { sendMagicLink, type FormState } from "@/app/actions";
import { EASE_EDITORIAL } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: FormState = {};

// Shared fade+lift for the form <-> confirmation swap.
const swap = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: EASE_EDITORIAL },
};

export function AuthForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(sendMagicLink, initial);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.sent ? (
        <motion.div
          key="sent"
          {...swap}
          role="status"
          className="rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground"
        >
          Check your inbox — we sent you a magic link to sign in.
        </motion.div>
      ) : (
        <motion.form
          key="form"
          {...swap}
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
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
              role="alert"
              className="text-sm text-destructive"
            >
              {state.error}
            </motion.p>
          )}
          {!compact && (
            <p className="text-xs text-muted-foreground">
              No password needed — we&apos;ll email you a one-tap sign-in link.
            </p>
          )}
        </motion.form>
      )}
    </AnimatePresence>
  );
}
