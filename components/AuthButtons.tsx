"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-9 w-20 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse" />;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50
                   dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50
                   dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        Account
      </Link>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800
                   dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Sign out
      </button>
    </div>
  );
}
