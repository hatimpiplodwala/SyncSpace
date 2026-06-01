"use server";

// Room sharing + admin server actions; authorization is enforced entirely by RLS (see 0001_init.sql).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

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

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Join a list of user_ids to their profile name + color. */
async function profilesFor(
  userIds: string[],
): Promise<Map<string, { name: string; color: string }>> {
  const map = new Map<string, { name: string; color: string }>();
  if (userIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_color")
    .in("user_id", userIds);
  for (const p of data ?? []) {
    const row = p as {
      user_id: string;
      display_name: string;
      avatar_color: string;
    };
    map.set(row.user_id, { name: row.display_name, color: row.avatar_color });
  }
  return map;
}

// --- Access requests --------------------------------------------------------

export async function requestAccess(roomId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("room_access_requests")
    .insert({ room_id: roomId, user_id: userId });
  // 23505 = unique_violation: a request already exists, treat as success.
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath(`/r/${roomId}`);
  return {};
}

export async function listAccessRequests(
  roomId: string,
): Promise<RequestRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("room_access_requests")
    .select("user_id, created_at")
    .eq("room_id", roomId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as { user_id: string; created_at: string }[];
  const profiles = await profilesFor(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    userId: r.user_id,
    createdAt: r.created_at,
    name: profiles.get(r.user_id)?.name ?? "Someone",
    color: profiles.get(r.user_id)?.color ?? "#64748b",
  }));
}

export async function approveRequest(
  roomId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  // Add the member (idempotent: ignore if they're already in).
  const { error: memberErr } = await supabase
    .from("room_members")
    .upsert(
      { room_id: roomId, user_id: userId, role: "editor" },
      { onConflict: "room_id,user_id", ignoreDuplicates: true },
    );
  if (memberErr) return { error: memberErr.message };

  const { error: statusErr } = await supabase
    .from("room_access_requests")
    .update({ status: "approved" })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (statusErr) return { error: statusErr.message };

  revalidatePath(`/r/${roomId}`);
  return {};
}

export async function denyRequest(
  roomId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("room_access_requests")
    .update({ status: "denied" })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath(`/r/${roomId}`);
  return {};
}

// --- Invite link ------------------------------------------------------------

export async function regenerateInviteToken(
  roomId: string,
): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase
    .from("rooms")
    .update({ invite_token: token })
    .eq("id", roomId);
  if (error) return { error: error.message };

  revalidatePath(`/r/${roomId}`);
  return { token };
}

// --- Room admin (owner) -----------------------------------------------------

export async function renameRoom(
  roomId: string,
  name: string,
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    return { error: "Name must be 1–60 characters." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("rooms")
    .update({ name: trimmed })
    .eq("id", roomId);
  if (error) return { error: error.message };

  revalidatePath(`/r/${roomId}`);
  revalidatePath("/");
  return {};
}

export async function softDeleteRoom(roomId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("rooms")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", roomId);
  if (error) return { error: error.message };

  revalidatePath(`/r/${roomId}`);
  revalidatePath("/");
  return {};
}

export async function kickMember(
  roomId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath(`/r/${roomId}`);
  return {};
}

export async function listMembers(roomId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("room_members")
    .select("user_id, role")
    .eq("room_id", roomId);
  const rows = (data ?? []) as { user_id: string; role: "owner" | "editor" }[];
  const profiles = await profilesFor(rows.map((r) => r.user_id));
  // Owner first, then by name.
  return rows
    .map((r) => ({
      userId: r.user_id,
      role: r.role,
      name: profiles.get(r.user_id)?.name ?? "Member",
      color: profiles.get(r.user_id)?.color ?? "#64748b",
    }))
    .sort((a, b) =>
      a.role === b.role
        ? a.name.localeCompare(b.name)
        : a.role === "owner"
          ? -1
          : 1,
    );
}
