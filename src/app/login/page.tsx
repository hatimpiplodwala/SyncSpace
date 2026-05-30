import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { LogoWordmark } from "@/components/Logo";
import { getAuthContext } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user, profile } = await getAuthContext();
  if (user) redirect(profile ? "/" : "/onboarding");

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex">
          <LogoWordmark />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a magic link.
        </p>

        {error === "callback" && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive"
          >
            That sign-in link was invalid or expired. Please request a new one.
          </p>
        )}

        <AuthForm />
      </div>
    </main>
  );
}
