"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { proFeaturesEnabled, type Plan } from "@/lib/flags";

type PlanResp =
  | { ok: true; plan: Plan; customerId?: string | null; expiresAt?: string | null }
  | { ok: false; error: string };

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan>("FREE");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    if (!id) return;
    (async () => {
      const r = await fetch(`/api/stripe/verify?session_id=${id}`);
      const data: PlanResp = await r.json();
      if (data.ok) {
        setPlan(data.plan);
        setMsg(
          data.expiresAt
            ? `Pro active — renews ${new Date(data.expiresAt).toLocaleString()}`
            : `Pro activated`
        );
      } else {
        setMsg(`Verify failed: ${data.error}`);
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Plan</h1>
      <p>Current plan: <strong>{plan}</strong></p>
      {!!msg && <p style={{ marginTop: 8 }}>{msg}</p>}

      {proFeaturesEnabled(plan) ? (
        <p style={{ marginTop: 16 }}>✅ You have access to all Pro features.</p>
      ) : (
        <form action="/api/billing/checkout" method="get" style={{ marginTop: 16 }}>
          <button>Upgrade to Pro</button>
        </form>
      )}

      <p style={{ marginTop: 24 }}>
        <Link href="/dashboard">Go to dashboard</Link>
      </p>
    </main>
  );
}
