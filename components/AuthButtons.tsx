"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AuthButtons() {
  const { data: session, status } = useSession();
  const [badge, setBadge] = useState<"FREE" | "PRO" | null>(null);

  // Light-weight plan fetch for a tiny badge (optional; safe to remove if undesired)
  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        const r = await fetch("/api/account/plan", { cache: "no-store" });
        const j = await r.json();
        const p = String(j?.plan ?? "FREE").toUpperCase();
        const pro =
          p !== "FREE" && (p.includes("MONTH") || p.includes("SEASON") || p === "PRO");
        if (alive) setBadge(pro ? "PRO" : "FREE");
      } catch {
        if (alive) setBadge(null);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Always show Account link */}
      <Link
        href="/account"
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-800"
      >
        Account
      </Link>

      {/* Optional tiny plan chip */}
      {badge && (
        <span
          className={[
            "hidden sm:inline-block rounded-full px-2 py-1 text-[11px] tracking-wide",
            badge === "PRO"
              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-600/30"
              : "bg-neutral-800 text-neutral-300 ring-1 ring-neutral-700",
          ].join(" ")}
          title={badge === "PRO" ? "Pro active" : "Free tier"}
        >
          {badge === "PRO" ? "Pro" : "Free"}
        </span>
      )}

      {status === "authenticated" ? (
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg bg-neutral-200 px-3 py-1.5 text-sm font-semibold text-black hover:bg-white"
        >
          Sign out
        </button>
      ) : (
        <button
          onClick={() => signIn(undefined, { callbackUrl: "/account" })}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400"
        >
          Sign in
        </button>
      )}
    </div>
  );
}
