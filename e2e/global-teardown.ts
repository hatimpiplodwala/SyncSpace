// Removes the throwaway room from global-setup (cascades); test users are left for reuse.

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadLocalEnv } from "./env";

loadLocalEnv();

export default async function globalTeardown() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  let meta: { skip?: boolean; roomId?: string };
  try {
    meta = JSON.parse(
      await readFile(path.join(process.cwd(), "e2e", ".auth", "meta.json"), "utf8"),
    );
  } catch {
    return;
  }
  if (meta.skip || !meta.roomId) return;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await admin.from("rooms").delete().eq("id", meta.roomId);
}
