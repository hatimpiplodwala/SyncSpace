"use server";

// Room sharing + admin server actions; authorization is enforced entirely by RLS (see 0001_init.sql).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

// Reject obviously-malformed ids before they reach Postgres, which would otherwise return an
// "invalid input syntax for type uuid" string we'd have to mask anyway — and a wasted round-trip.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function badIds(...ids: string[]): boolean {
  return ids.some((id) => !UUID_RE.test(id));
}

// Never surface raw Postgres/PostgREST error text to the client (it leaks schema, constraint, and
// query details). Log the real error server-side; return a generic, safe message instead.
function dbFail(context: string, error: unknown): ActionResult {
  console.error(`[action] ${context}:`, error);
  return { error: "Something went wrong. Please try again." };
}

// Map a PostgREST mutation result to an ActionResult. A zero affected-row count means
// RLS silently no-op'd a write the caller isn't allowed to make, so treat it as a denial.
function checkMutation(
  context: string,
  res: { error: { message: string } | null; count: number | null },
  notAllowed = "Not allowed.",
): ActionResult {
  if (res.error) return dbFail(context, res.error);
  if (res.count === 0) return { error: notAllowed };
  return {};
}

export type MemberRow = {
  userId: string;
  role: "owner" | "editor";
  name: string;
  color: string;
};

export type RequestRow = {
  userId: string;
  name: string;
  color: string;
  createdAt: string;
};

async function getUserId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Embedded profile row from PostgREST resource embedding (see 0003 migration: FK on user_id).
type EmbeddedProfile = { display_name: string; avatar_color: string } | null;

function profileName(p: EmbeddedProfile, fallback: string): string {
  return p?.display_name ?? fallback;
}

function profileColor(p: EmbeddedProfile): string {
  return p?.avatar_color ?? "#64748b";
}

// --- Access requests --------------------------------------------------------

export async function requestAccess(roomId: string): Promise<ActionResult> {
  if (badIds(roomId)) return { error: "Invalid request." };
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("room_access_requests")
    .insert({ room_id: roomId, user_id: userId });
  // 23505 = unique_violation: a request already exists, treat as success.
  if (error && error.code !== "23505") return dbFail("requestAccess", error);

  revalidatePath(`/r/${roomId}`);
  return {};
}

export async function listAccessRequests(
  roomId: string,
): Promise<RequestRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("room_access_requests")
    .select("user_id, created_at, profiles(display_name, avatar_color)")
    .eq("room_id", roomId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  // postgrest-js types embedded relations as arrays by default; at runtime this is a
  // single object because the FK targets profiles.user_id (PK, unique).
  const rows = (data ?? []) as unknown as {
    user_id: string;
    created_at: string;
    profiles: EmbeddedProfile;
  }[];
  return rows.map((r) => ({
    userId: r.user_id,
    createdAt: r.created_at,
    name: profileName(r.profiles, "Someone"),
    color: profileColor(r.profiles),
  }));
}

export async function approveRequest(
  roomId: string,
  userId: string,
): Promise<ActionResult> {
  if (badIds(roomId, userId)) return { error: "Invalid request." };
  const supabase = await createClient();

  // One atomic round-trip: owner-check + member insert + status flip, locked against a
  // concurrent approve/deny. See 0004_approve_request_rpc.sql for the return values.
  const { data: result, error } = await supabase.rpc("approve_access_request", {
    p_room_id: roomId,
    p_user_id: userId,
  });
  if (error) return dbFail("approveRequest", error);
  if (result === "not_found") return { error: "No request found." };
  if (result === "handled") return { error: "Request already handled." };
  if (result !== "approved") return { error: "Not allowed." };

  revalidatePath(`/r/${roomId}`);
  return {};
}

export async function denyRequest(
  roomId: string,
  userId: string,
): Promise<ActionResult> {
  if (badIds(roomId, userId)) return { error: "Invalid request." };
  const supabase = await createClient();
  const result = checkMutation(
    "denyRequest",
    await supabase
      .from("room_access_requests")
      .update({ status: "denied" }, { count: "exact" })
      .eq("room_id", roomId)
      .eq("user_id", userId),
  );
  if (result.error) return result;

  revalidatePath(`/r/${roomId}`);
  return {};
}

// --- Invite link ------------------------------------------------------------

export async function joinWithToken(
  roomId: string,
  token: string,
): Promise<ActionResult> {
  if (badIds(roomId)) return { error: "Invalid request." };
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { error: "You need to be signed in." };

  const { data: joined, error } = await supabase.rpc("join_room_with_token", {
    p_room_id: roomId,
    p_token: token,
  });
  if (error) return dbFail("joinWithToken", error);
  if (!joined) return { error: "Invalid or expired invite link." };

  redirect(`/r/${roomId}`);
}

export async function regenerateInviteToken(
  roomId: string,
): Promise<{ token?: string; error?: string }> {
  if (badIds(roomId)) return { error: "Invalid request." };
  const supabase = await createClient();
  const token = crypto.randomUUID().replace(/-/g, "");
  const result = checkMutation(
    "regenerateInviteToken",
    await supabase
      .from("rooms")
      .update({ invite_token: token }, { count: "exact" })
      .eq("id", roomId),
  );
  if (result.error) return result;

  revalidatePath(`/r/${roomId}`);
  return { token };
}

// --- Room admin (owner) -----------------------------------------------------

export async function renameRoom(
  roomId: string,
  name: string,
): Promise<ActionResult> {
  if (badIds(roomId)) return { error: "Invalid request." };
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    return { error: "Name must be 1–60 characters." };
  }
  const supabase = await createClient();
  const result = checkMutation(
    "renameRoom",
    await supabase
      .from("rooms")
      .update({ name: trimmed }, { count: "exact" })
      .eq("id", roomId),
  );
  if (result.error) return result;

  revalidatePath(`/r/${roomId}`);
  revalidatePath("/");
  return {};
}

export async function softDeleteRoom(roomId: string): Promise<ActionResult> {
  if (badIds(roomId)) return { error: "Invalid request." };
  const supabase = await createClient();
  const result = checkMutation(
    "softDeleteRoom",
    await supabase
      .from("rooms")
      .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", roomId),
  );
  if (result.error) return result;

  revalidatePath(`/r/${roomId}`);
  revalidatePath("/");
  return {};
}

export async function kickMember(
  roomId: string,
  userId: string,
): Promise<ActionResult> {
  if (badIds(roomId, userId)) return { error: "Invalid request." };
  const supabase = await createClient();
  // Block self-kick of the owner: an ownerless-but-member-having room is an undefined state.
  const callerId = await getUserId(supabase);
  if (callerId && callerId === userId) {
    const { data: room } = await supabase
      .from("rooms")
      .select("owner_id")
      .eq("id", roomId)
      .maybeSingle<{ owner_id: string }>();
    if (room?.owner_id === userId) {
      return { error: "Owners can't remove themselves. Delete the board instead." };
    }
  }

  const result = checkMutation(
    "kickMember",
    await supabase
      .from("room_members")
      .delete({ count: "exact" })
      .eq("room_id", roomId)
      .eq("user_id", userId),
  );
  if (result.error) return result;

  revalidatePath(`/r/${roomId}`);
  return {};
}

export async function listMembers(roomId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("room_members")
    .select("user_id, role, profiles(display_name, avatar_color)")
    .eq("room_id", roomId);
  const rows = (data ?? []) as unknown as {
    user_id: string;
    role: "owner" | "editor";
    profiles: EmbeddedProfile;
  }[];
  // Owner first, then by name.
  return rows
    .map((r) => ({
      userId: r.user_id,
      role: r.role,
      name: profileName(r.profiles, "Member"),
      color: profileColor(r.profiles),
    }))
    .sort((a, b) =>
      a.role === b.role
        ? a.name.localeCompare(b.name)
        : a.role === "owner"
          ? -1
          : 1,
    );
}
