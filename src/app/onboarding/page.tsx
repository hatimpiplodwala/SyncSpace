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
        <h1
          className="rise font-display text-3xl font-medium tracking-tight text-foreground"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          What should we call you?
        </h1>
        <p
          className="rise mb-6 mt-2 text-sm text-muted-foreground"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          This name and a color will identify you to collaborators on a board.
        </p>
        <div className="rise" style={{ "--i": 2 } as React.CSSProperties}>
          <OnboardingForm defaultName={suggested} />
        </div>
      </div>
    </main>
  );
}
