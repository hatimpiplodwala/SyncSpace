import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createRoom, signOut } from "@/app/actions";
import { Hero } from "@/components/marketing/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Footer } from "@/components/marketing/Footer";
import { RoomList } from "@/components/RoomList";
import type { Room } from "@/types/db";

export default async function HomePage() {
  const { user, profile } = await getAuthContext();

  // Signed out (or Supabase not yet configured): marketing landing.
  if (!user) return <Landing />;

  // Signed in but no profile yet: finish onboarding first.
  if (!profile) redirect("/onboarding");

  // Signed in with a profile: the dashboard.
  const supabase = await createClient();
  const { data } = await supabase
    .from("rooms")
    .select("id, name, owner_id, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const rooms = (data ?? []) as Pick<
    Room,
    "id" | "name" | "owner_id" | "created_at"
  >[];

  return (
    <main className="flex-1">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gray-900 text-sm text-white">
              S
            </span>
            SyncSpace
          </div>
          <div className="flex items-center gap-3">
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: profile.avatar_color }}
              title={profile.display_name}
            >
              {profile.display_name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm text-gray-600 sm:inline">
              {profile.display_name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Your boards
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create a board, then share the link to collaborate live.
            </p>
          </div>
          <form action={createRoom} className="flex gap-2">
            <label htmlFor="name" className="sr-only">
              Board name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              maxLength={60}
              placeholder="New board name"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700"
            >
              + Create board
            </button>
          </form>
        </div>

        <div className="mt-8">
          <RoomList rooms={rooms} currentUserId={user.id} />
        </div>
      </div>
    </main>
  );
}

function Landing() {
  return (
    <main className="flex-1">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gray-900 text-sm text-white">
              S
            </span>
            SyncSpace
          </div>
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Sign in
          </Link>
        </div>
      </header>
      <Hero />
      <FeatureGrid />
      <Footer />
    </main>
  );
}
