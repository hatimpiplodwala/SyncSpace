// Prepares two authenticated browser sessions for the sync e2e by injecting
// Supabase sessions (no magic-link round trip). Using the service-role key it
// ensures two confirmed users + their profiles exist, creates a fresh room they
// both belong to, then signs each user in through @supabase/ssr so the library
// itself produces correctly-formatted (and chunked) auth cookies — which we save
// as Playwright storage states. Writes meta.json with the room id, or a skip
// marker when the env isn't configured so the spec can skip cleanly.

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadLocalEnv } from "./env";

loadLocalEnv();

const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const USERS = [
  { tag: "a", email: "e2e-a@syncspace.test", password: "e2e-Password-A-123!", name: "E2E Alice", color: "#2563eb" },
  { tag: "b", email: "e2e-b@syncspace.test", password: "e2e-Password-B-123!", name: "E2E Bob", color: "#16a34a" },
] as const;

type User = (typeof USERS)[number];

async function writeMeta(meta: Record<string, unknown>) {
  await writeFile(path.join(AUTH_DIR, "meta.json"), JSON.stringify(meta, null, 2));
}

export default async function globalSetup() {
  await mkdir(AUTH_DIR, { recursive: true });

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON ||
    !SERVICE_KEY ||
    SUPABASE_URL.includes("your-project-ref")
  ) {
    await writeMeta({
      skip: true,
      reason:
        "e2e sync test needs NEXT_PUBLIC_SUPABASE_URL/ANON_KEY + SUPABASE_SERVICE_ROLE_KEY in .env.local",
    });
    return;
  }

  // No generated Database types in this project, so use a permissive client for
  // the admin writes below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createClient<any>(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ensure a user + profile exists (idempotent across runs), return its id.
  const ensureUser = async (u: User): Promise<string> => {
    const created = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    let userId = created.data?.user?.id;
    if (!userId) {
      // Already exists — find it.
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list.data.users.find((x) => x.email === u.email)?.id;
    }
    if (!userId) throw new Error(`could not create or find user ${u.email}`);
    const { error } = await admin
      .from("profiles")
      .upsert(
        { user_id: userId, display_name: u.name, avatar_color: u.color },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(`upsert profile failed: ${error.message}`);
    return userId;
  };

  // 1. Both users + profiles.
  const ids: Record<string, string> = {};
  for (const u of USERS) ids[u.tag] = await ensureUser(u);

  // 2. Fresh room owned by A (starts empty); add B as an editor. The
  //    add_owner_as_member trigger handles A's membership.
  const roomId = crypto.randomUUID();
  const { error: roomErr } = await admin
    .from("rooms")
    .insert({ id: roomId, owner_id: ids.a, name: "E2E sync test" });
  if (roomErr) throw new Error(`create room failed: ${roomErr.message}`);

  const { error: memErr } = await admin
    .from("room_members")
    .insert({ room_id: roomId, user_id: ids.b, role: "editor" });
  if (memErr) throw new Error(`add member failed: ${memErr.message}`);

  // 3. Sign each user in via @supabase/ssr and capture the cookies it sets.
  const host = new URL(BASE_URL).hostname;
  for (const u of USERS) {
    const state = await storageStateFor(u, host);
    await writeFile(path.join(AUTH_DIR, `${u.tag}.json`), JSON.stringify(state));
  }

  await writeMeta({ skip: false, roomId });
}

async function storageStateFor(u: User, host: string) {
  const jar: Record<string, string> = {};
  const client = createServerClient(SUPABASE_URL!, SUPABASE_ANON!, {
    cookies: {
      getAll: () =>
        Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const c of cookies) jar[c.name] = c.value;
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email: u.email,
    password: u.password,
  });
  if (error) throw new Error(`sign-in failed for ${u.email}: ${error.message}`);

  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  return {
    cookies: Object.entries(jar).map(([name, value]) => ({
      name,
      value,
      domain: host,
      path: "/",
      expires,
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
    origins: [],
  };
}
