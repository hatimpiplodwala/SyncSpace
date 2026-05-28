"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import { userColor } from "@/lib/colors";

export type FormState = { error?: string; sent?: boolean };

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : SITE_URL;
}

// --- Magic-link sign in ------------------------------------------------------
export async function sendMagicLink(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured yet. See README / .env.local." };
  }
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const origin = await originFromHeaders();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  return { sent: true };
}

// --- First-login profile creation -------------------------------------------
export async function completeOnboarding(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 2) {
    return { error: "Display name must be at least 2 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    display_name: displayName,
    avatar_color: userColor(user.id),
  });
  if (error) return { error: error.message };

  redirect("/");
}

// --- Room creation -----------------------------------------------------------
export async function createRoom(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim() || "Untitled board";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Generate the id client-side and insert WITHOUT a RETURNING clause
  // (no `.select()`). Using RETURNING here would make Postgres apply the
  // `rooms_select` policy (is_room_member) to the new row, but membership is
  // only added by the AFTER INSERT trigger — which fires after that RLS check —
  // so RETURNING would fail with a 42501. A plain insert only runs the INSERT
  // WITH CHECK (auth.uid() = owner_id), which passes.
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("rooms")
    .insert({ id, owner_id: user.id, name });
  if (error) throw new Error(error.message);

  redirect(`/r/${id}`);
}

// --- Sign out ----------------------------------------------------------------
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
