"use server";

// Room sharing + admin server actions; authorization is enforced entirely by RLS (see 0001_init.sql).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const supabase = await createClient();

  // Verify the request exists and is pending BEFORE adding the member — otherwise this action
  // becomes an "add anyone" path (the owner could already do that, but the API would diverge
  // from its name and any future caller would inherit the surprise).
  // RLS allows only the requester or the owner to read this row.
  const { data: req } = await supabase
    .from("room_access_requests")
    .select("status")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle<{ status: string }>();
  if (!req) return { error: "No request found." };
  if (req.status !== "pending") return { error: "Request already handled." };

  // Add the member (idempotent: ignore if they're already in).
  const { error: memberErr } = await supabase
    .from("room_members")
    .upsert(
      { room_id: roomId, user_id: userId, role: "editor" },
      { onConflict: "room_id,user_id", ignoreDuplicates: true },
    );
  if (memberErr) return { error: memberErr.message };

  // RLS silently no-ops UPDATEs the caller isn't allowed to do; require a row update.
  const { error: statusErr, count } = await supabase
    .from("room_access_requests")
    .update({ status: "approved" }, { count: "exact" })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (statusErr) return { error: statusErr.message };
  if (count === 0) return { error: "Not allowed." };

  revalidatePath(`/r/${roomId}`);
  return {};
}

export async function denyRequest(
  roomId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("room_access_requests")
    .update({ status: "denied" }, { count: "exact" })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  if (count === 0) return { error: "Not allowed." };

  revalidatePath(`/r/${roomId}`);
  return {};
}

// --- Invite link ------------------------------------------------------------

export async function joinWithToken(
  roomId: string,
  token: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return { error: "You need to be signed in." };

  const { data: joined, error } = await supabase.rpc("join_room_with_token", {
    p_room_id: roomId,
    p_token: token,
  });
  if (error) return { error: error.message };
  if (!joined) return { error: "Invalid or expired invite link." };

  redirect(`/r/${roomId}`);
}

export async function regenerateInviteToken(
  roomId: string,
): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error, count } = await supabase
    .from("rooms")
    .update({ invite_token: token }, { count: "exact" })
    .eq("id", roomId);
  if (error) return { error: error.message };
  if (count === 0) return { error: "Not allowed." };

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
  const { error, count } = await supabase
    .from("rooms")
    .update({ name: trimmed }, { count: "exact" })
    .eq("id", roomId);
  if (error) return { error: error.message };
  if (count === 0) return { error: "Not allowed." };

  revalidatePath(`/r/${roomId}`);
  revalidatePath("/");
  return {};
}

export async function softDeleteRoom(roomId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("rooms")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", roomId);
  if (error) return { error: error.message };
  if (count === 0) return { error: "Not allowed." };

  revalidatePath(`/r/${roomId}`);
  revalidatePath("/");
  return {};
}

export async function kickMember(
  roomId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  // Block self-kick of the owner: an ownerless-but-member-having room is an undefined state.
  const callerId = await getUserId();
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

  const { error, count } = await supabase
    .from("room_members")
    .delete({ count: "exact" })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  if (count === 0) return { error: "Not allowed." };

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
