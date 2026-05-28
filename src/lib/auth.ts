import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profile } from "@/types/db";
import type { User } from "@supabase/supabase-js";

export type AuthContext = {
  configured: boolean;
  user: User | null;
  profile: Profile | null;
};

// One round-trip helper for server components: who is signed in, and do they
// have a profile yet (which determines whether onboarding is needed).
export async function getAuthContext(): Promise<AuthContext> {
  if (!isSupabaseConfigured) {
    return { configured: false, user: null, profile: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { configured: true, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Profile>();

  return { configured: true, user, profile: profile ?? null };
}
