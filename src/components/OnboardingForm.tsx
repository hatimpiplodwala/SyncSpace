"use client";

import { useActionState } from "react";
import { completeOnboarding, type FormState } from "@/app/actions";

const initial: FormState = {};

export function OnboardingForm({ defaultName }: { defaultName?: string }) {
  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="display_name" className="text-sm font-medium text-gray-700">
        Display name
      </label>
      <input
        id="display_name"
        name="display_name"
        type="text"
        required
        minLength={2}
        maxLength={40}
        defaultValue={defaultName}
        autoFocus
        placeholder="Ada Lovelace"
        className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="mt-1 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/30 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
