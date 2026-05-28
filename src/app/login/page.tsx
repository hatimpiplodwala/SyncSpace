import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
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
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gray-900 text-sm text-white">
            S
          </span>
          SyncSpace
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Sign in
        </h1>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          Enter your email and we&apos;ll send you a magic link.
        </p>

        {error === "callback" && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          >
            That sign-in link was invalid or expired. Please request a new one.
          </p>
        )}

        <AuthForm />
      </div>
    </main>
  );
}
