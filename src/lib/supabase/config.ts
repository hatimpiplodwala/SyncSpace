// Supabase env config and the "is it configured?" check so the app degrades gracefully.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("your-project-ref"),
);

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Server-only: resolve the canonical site URL at request time so Vercel previews
// (different host per branch) work without setting NEXT_PUBLIC_SITE_URL per deploy.
// We trust env vars (NEXT_PUBLIC_SITE_URL, VERCEL_URL) but never request headers — see
// the deleted originFromHeaders for why. Use this for emailed redirects, NOT for any
// behavior the client needs to know about (it's not exposed to the bundle).
export function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
