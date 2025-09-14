// app/account/page.tsx
"use client";

import { useCallback, useState } from "react";

type PlanKey = "day" | "week" | "monthly" | "season";

export default function AccountPage() {
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const startCheckout = useCallback(async (plan: PlanKey = "monthly") => {
    try {
      setMsg(null);
      setLoading(plan);
      const res = await fetch(`/api/billing/checkout?plan=${plan}`, { method: "GET" });
      const data = await res.json();
      if (!data.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err: any) {
      setMsg(err?.message || "Checkout failed");
      setLoading(null);
    }
  }, []);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <section className="rounded-lg border border-neutral-700 p-5">
        <p className="text-sm text-neutral-400 mb-2">Signed in as your account</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm">Current plan:</div>
            <div className="text-lg font-medium">FREE</div>
            {msg && <p className="mt-2 text-sm text-red-400">Checkout failed: {msg}</p>}
          </div>
          <button
            onClick={() => startCheckout("monthly")}
            disabled={!!loading}
            className="rounded-md border border-neutral-600 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            {loading === "monthly" ? "Starting…" : "Upgrade to Pro"}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-neutral-700 p-5">
          <h3 className="font-semibold mb-2">Free features</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-300">
            <li>Player search and basic stats</li>
            <li>Recent games view</li>
            <li>Shareable links</li>
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-700 p-5">
          <h3 className="font-semibold mb-2">Pro features</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-300">
            <li>Advanced filters & KPI grid</li>
            <li>Save custom views</li>
            <li>CSV export</li>
            <li>Priority data refresh</li>
          </ul>
          <button
            onClick={() => startCheckout("monthly")}
            disabled={!!loading}
            className="mt-4 rounded-md border border-neutral-600 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            {loading ? "Starting…" : "Unlock Pro"}
          </button>
        </div>
      </div>
    </main>
  );
}
