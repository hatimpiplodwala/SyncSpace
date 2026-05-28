import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase magic-link / PKCE callback: exchange the `code` for a session,
// then send the user on. New users (no profile row yet) land on /onboarding,
// which is enforced by the `/` page.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback`);
}
