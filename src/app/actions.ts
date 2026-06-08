"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import { userColor } from "@/lib/colors";

export type FormState = { error?: string; sent?: boolean };

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
  // Pin to SITE_URL: never trust request headers (Origin / X-Forwarded-Host) for the
  // emailed redirect — Supabase's allow-list is the second line of defense, but the
  // first is just not letting the redirect target vary by request at all.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
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

  // Insert without RETURNING: the rooms_select RLS policy would reject it before the
  // membership trigger fires, so generate the id here and skip .select().
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
