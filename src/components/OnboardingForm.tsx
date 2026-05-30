"use client";

import { useActionState } from "react";
import { completeOnboarding, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

export function OnboardingForm({ defaultName }: { defaultName?: string }) {
  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Label htmlFor="display_name">Display name</Label>
      <Input
        id="display_name"
        name="display_name"
        type="text"
        required
        minLength={2}
        maxLength={40}
        defaultValue={defaultName}
        autoFocus
        placeholder="Ada Lovelace"
        className="h-10"
      />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={isPending} className="mt-1">
        {isPending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
