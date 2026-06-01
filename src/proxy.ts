import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16's "proxy" convention (formerly middleware): refresh auth cookies each request.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
