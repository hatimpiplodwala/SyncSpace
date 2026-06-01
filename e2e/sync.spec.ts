import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

function meta(): { skip: boolean; reason?: string; roomId?: string } {
  try {
    return JSON.parse(readFileSync(path.join(AUTH_DIR, "meta.json"), "utf8"));
  } catch {
    return { skip: true, reason: "global-setup did not run" };
  }
}

const HINT = /Pick a tool above/i;

test("a rectangle drawn in one browser shows up in another", async ({ browser }) => {
  const m = meta();
  test.skip(m.skip, m.reason ?? "e2e not configured");
  const roomId = m.roomId!;

  // Two isolated, separately-authenticated browser contexts in the same room.
  const ctxA = await browser.newContext({
    baseURL: BASE_URL,
    storageState: path.join(AUTH_DIR, "a.json"),
  });
  const ctxB = await browser.newContext({
    baseURL: BASE_URL,
    storageState: path.join(AUTH_DIR, "b.json"),
  });
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  await a.goto(`/r/${roomId}`);
  await b.goto(`/r/${roomId}`);

  // Both reach the canvas (member + authed). Empty room => the onboarding hint
  // is shown; it's bound to shapes-map size, so it's a reliable "is the board
  // empty?" signal for both peers.
  await expect(a.getByText(HINT)).toBeVisible();
  await expect(b.getByText(HINT)).toBeVisible();

  // A picks the rectangle tool (aria-keyshortcuts is the stable handle) and drags.
  await a.locator('button[aria-keyshortcuts="R"]').click();
  const canvas = a.locator("canvas");
  const box = (await canvas.boundingBox())!;
  await a.mouse.move(box.x + 120, box.y + 120);
  await a.mouse.down();
  await a.mouse.move(box.x + 320, box.y + 240, { steps: 12 });
  await a.mouse.up();

  // The shape exists locally for A...
  await expect(a.getByText(HINT)).toBeHidden();
  // ...and propagates to B over Supabase Realtime. PRD target is <1s; allow a
  // small margin for cloud round-trip / CI jitter.
  await expect(b.getByText(HINT)).toBeHidden({ timeout: 2000 });

  await ctxA.close();
  await ctxB.close();
});
