"use client";
import { useSession, signIn, signOut } from "next-auth/react";
export default function AuthButtons() {
  const { data: session, status } = useSession();
  const cls = "rounded-md border px-3 py-1.5 text-sm border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700";
  if (status === "loading") return <button className={cls} disabled>…</button>;
  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.name && <span className="hidden sm:inline text-xs text-neutral-600 dark:text-neutral-400">{session.user.name}</span>}
        <button className={cls} onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }
  return <button className={cls} onClick={() => signIn("google")}>Sign in</button>;
}