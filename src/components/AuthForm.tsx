"use client";

import { useActionState } from "react";
import { sendMagicLink, type FormState } from "@/app/actions";

const initial: FormState = {};

export function AuthForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(sendMagicLink, initial);

  if (state.sent) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
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
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/30 disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send magic link"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {!compact && (
        <p className="text-xs text-gray-500">
          No password needed — we&apos;ll email you a one-tap sign-in link.
        </p>
      )}
    </form>
  );
}
