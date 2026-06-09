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

// Server-only: resolve the canonical site URL at request time. Trust env vars only —
// never request headers (see the deleted originFromHeaders). Order:
//   1. NEXT_PUBLIC_SITE_URL — explicit override; what we want in prod.
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel-injected production alias (stable across
//      deploys, e.g. "sync-space-gold-kappa.vercel.app"). MUST be in the Supabase
//      Redirect URLs allowlist.
//   3. VERCEL_URL — per-deploy hostname (e.g. "...-abc123.vercel.app"). Used only as
//      a last-ditch fallback; preview deploys won't match the allowlist without a
//      wildcard entry, so magic links from previews may fall back to Supabase's
//      Site URL. Set NEXT_PUBLIC_SITE_URL in Production to avoid this.
//   4. localhost — local dev.
export function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
