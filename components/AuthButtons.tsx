// components/AuthButtons.tsx
"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function SignInButton() {
  return (
    <button onClick={() => signIn("google", { callbackUrl: "/" })} className="px-3 py-2 rounded-md border">
      Sign in with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })} className="px-3 py-2 rounded-md border">
      Sign out
    </button>
  );
}

export function AccountMenu() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;

  return session ? (
    <div className="flex items-center gap-3">
      <span className="text-sm">Hi, {session.user?.name ?? "user"}</span>
      <Link href="/account" className="underline">Account</Link>
      <SignOutButton />
    </div>
  ) : (
    <SignInButton />
  );
}

// 👇 default export so you can <AuthButtons />
export default function AuthButtons() {
  return <AccountMenu />;
}
