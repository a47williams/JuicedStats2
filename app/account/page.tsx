"use client";

import { useEffect, useState } from "react";

type Plan = "FREE" | "PRO";

export default function AccountPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("Checking your plan…");
  const [busy, setBusy] = useState(false);

  // Hit /api/stripe/verify and pass through any ?session_id returned by Stripe
  useEffect(() => {
    (async () => {
      try {
        const qs = typeof window !== "undefined" ? window.location.search : "";
        const res = await fetch(`/api/stripe/verify${qs}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          setMsg(`Verify failed: ${data?.error ?? res.statusText}`);
          setPlan("FREE");
          return;
        }

        setPlan(data.plan as Plan);
        setExpiresAt(data.expiresAt ?? null);

        if (data.plan === "PRO") {
          setMsg(
            data.expiresAt
              ? `You're Pro. Renews ${new Date(data.expiresAt).toLocaleString()}.`
              : "You're Pro. 🎉"
          );
        } else {
          setMsg("You’re on the FREE plan.");
        }
      } catch (err: any) {
        setMsg(`Verify error: ${err?.message ?? "unknown"}`);
        setPlan("FREE");
      }
    })();
  }, []);

  async function onUpgrade() {
    try {
      setBusy(true);
      const here = typeof window !== "undefined" ? window.location.href : "/";
      const res = await fetch(`/api/billing/checkout?return_url=${encodeURIComponent(here)}`);
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setMsg(`Checkout failed: ${data?.error ?? res.statusText}`);
        setBusy(false);
        return;
      }
      window.location.href = data.url as string; // Redirect to Stripe Checkout
    } catch (err: any) {
      setMsg(`Checkout error: ${err?.message ?? "unknown"}`);
      setBusy(false);
    }
  }

  const Panel = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <h3 style={{ margin: "0 0 8px 0", fontWeight: 600 }}>{title}</h3>
      {children}
    </div>
  );

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1>Account</h1>

      <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
        <Panel title="Signed in as your account">
          <p style={{ margin: "6px 0 12px 0" }}>
            <strong>Current plan:</strong>{" "}
            <span style={{ color: plan === "PRO" ? "#22c55e" : "#f97316" }}>
              {plan ?? "…"}
            </span>
          </p>

          <p style={{ margin: "0 0 14px 0", opacity: 0.85 }}>{msg}</p>

          {plan !== "PRO" ? (
            <button
              onClick={onUpgrade}
              disabled={busy}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
              aria-busy={busy}
            >
              {busy ? "Starting checkout…" : "Upgrade to Pro"}
            </button>
          ) : (
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              {expiresAt
                ? `Renews ${new Date(expiresAt).toLocaleString()}`
                : "Thanks for supporting JuicedStats!"}
            </div>
          )}
        </Panel>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <Panel title="Free features">
            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.95 }}>
              <li>Player search and basic stats</li>
              <li>Recent games view</li>
              <li>Shareable links</li>
            </ul>
          </Panel>

          <Panel title="Pro features">
            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.95 }}>
              <li>Advanced filters & KPI grid</li>
              <li>Save custom views</li>
              <li>CSV export</li>
              <li>Priority data refresh</li>
            </ul>

            {plan !== "PRO" && (
              <button
                onClick={onUpgrade}
                disabled={busy}
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.18)",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.6 : 1,
                }}
                aria-busy={busy}
              >
                Unlock Pro
              </button>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
