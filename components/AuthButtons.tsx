"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButtons() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <button
        className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm opacity-60"
        disabled
      >
        Loading…
      </button>
    );
  }

  if (status === "authenticated") {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-900"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/account" })}
      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
    >
      Sign in
    </button>
  );
}
