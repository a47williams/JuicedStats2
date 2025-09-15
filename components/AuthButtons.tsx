// components/AuthButtons.tsx
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function AuthButtons() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="rounded-lg px-3 py-1.5 text-sm font-medium bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account"
        className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
      >
        Hi, {session.user.name ?? session.user.email ?? "Account"}
      </Link>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button
          type="submit"
          className="rounded-lg px-3 py-1.5 text-sm font-medium border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
