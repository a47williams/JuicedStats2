// app/account/UpgradeButton.tsx
"use client";

import * as React from "react";

export default function UpgradeButton({
  plan,
  children,
}: {
  plan: "day" | "week" | "monthly" | "season";
  children: React.ReactNode;
}) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function startCheckout() {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`/api/billing/checkout?plan=${plan}`, {
        method: "GET",
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error("Unexpected response from checkout");
      }

      if (!data?.ok || !data?.url) {
        throw new Error(data?.error || "Checkout failed");
      }
      window.location.href = data.url as string;
    } catch (e: any) {
      setErr(e?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col">
      <button
        onClick={startCheckout}
        disabled={loading}
        className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-white/5 disabled:opacity-60"
      >
        {loading ? "Starting checkout…" : children}
      </button>
      {err ? <span className="mt-1 text-xs text-red-400">{err}</span> : null}
    </div>
  );
}
