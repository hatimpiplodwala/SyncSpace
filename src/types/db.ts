// Hand-written row types for the Postgres tables in 0001_init.sql.
// (Can be replaced later with `supabase gen types typescript`.)

export type Profile = {
  user_id: string;
  display_name: string;
  avatar_color: string;
  created_at: string;
};

export type Room = {
  id: string;
  owner_id: string;
  name: string;
  invite_token: string;
  deleted_at: string | null;
  created_at: string;
};

export type RoomRole = "owner" | "editor";

export type RoomMember = {
  room_id: string;
  user_id: string;
  role: RoomRole;
  joined_at: string;
};

export type AccessRequestStatus = "pending" | "approved" | "denied";

export type RoomAccessRequest = {
  id: number;
  room_id: string;
  user_id: string;
  status: AccessRequestStatus;
  created_at: string;
};
