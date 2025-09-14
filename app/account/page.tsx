// app/account/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { proFeaturesEnabled, type Plan } from "@/lib/flags";

type VerifyResp =
  | { ok: true; plan: Plan; customerId?: string | null; expiresAt?: string | null }
  | { ok: false; error: string };

export default function AccountPage() {
  const [plan, setPlan] = useState<Plan>("FREE");
  const [info, setInfo] = useState("");

  // If redirected back from checkout with ?session_id=...
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    if (!id) return;
    (async () => {
      const r = await fetch(`/api/stripe/verify?session_id=${id}`);
      const data: VerifyResp = await r.json();
      if (data.ok) {
        setPlan(data.plan);
        setInfo(
          data.expiresAt
            ? `Pro active — renews ${new Date(data.expiresAt).toLocaleString()}`
            : `Pro activated`
        );
      } else {
        setInfo(`Verify failed: ${data.error}`);
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Account</h1>

      <p style={{ marginTop: 8 }}>
        Current plan: <strong>{plan}</strong>
      </p>
      {!!info && <p style={{ marginTop: 6 }}>{info}</p>}

      {proFeaturesEnabled(plan) ? (
        <>
          <p style={{ marginTop: 16 }}>✅ You have access to all Pro features.</p>
          <p style={{ marginTop: 16 }}>
            <Link href="/dashboard">Go to dashboard</Link>
          </p>
        </>
      ) : (
        <>
          <p style={{ marginTop: 12 }}>
            Pro includes: saved views, export CSV, KPI grid, advanced filters, and more.
          </p>
          <form action="/api/billing/checkout" method="get" style={{ marginTop: 16 }}>
            <button>Upgrade to Pro</button>
          </form>
        </>
      )}
    </main>
  );
}
