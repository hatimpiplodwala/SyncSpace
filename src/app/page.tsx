import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createRoom, signOut } from "@/app/actions";
import { LogoWordmark } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hero } from "@/components/marketing/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Footer } from "@/components/marketing/Footer";
import { RoomList } from "@/components/RoomList";
import { DashboardCommands } from "@/components/DashboardCommands";
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
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <LogoWordmark />
          <UserMenu
            name={profile.display_name}
            color={profile.avatar_color}
            signOutAction={signOut}
          />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-mono">Workspace</p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground">
              Your boards
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <DashboardCommands
              boards={rooms.map((r) => ({ id: r.id, name: r.name }))}
            />
            <form action={createRoom} className="flex gap-2">
            <label htmlFor="name" className="sr-only">
              Board name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              maxLength={60}
              placeholder="New board name"
              className="h-10 w-56"
            />
            <Button type="submit" size="lg" className="whitespace-nowrap">
              Create board
            </Button>
            </form>
          </div>
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
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <LogoWordmark />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>
      <Hero />
      <FeatureGrid />
      <Footer />
    </main>
  );
}
