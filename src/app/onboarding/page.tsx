import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";
import { getAuthContext } from "@/lib/auth";

export default async function OnboardingPage() {
  const { user, profile } = await getAuthContext();
  if (!user) redirect("/login");
  if (profile) redirect("/");

  const suggested =
    typeof user.email === "string" ? user.email.split("@")[0] : "";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          What should we call you?
        </h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          This name and a color will identify you to collaborators on a board.
        </p>
        <OnboardingForm defaultName={suggested} />
      </div>
    </main>
  );
}
