// app/account/page.tsx
"use client";

import { useEffect, useState } from "react";

type Plan = "FREE" | "PRO";
type VerifyResponse = {
  ok: boolean;
  plan: Plan;
  email?: string | null;
  customerId?: string | null;
  expiresAt?: string | null;
  error?: string;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan>("FREE");
  const [email, setEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const isPro = plan === "PRO";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stripe/verify", { cache: "no-store" });
        const data: VerifyResponse = await res.json();
        if (data.ok) {
          setPlan(data.plan);
          setEmail(data.email ?? null);
          setExpiresAt(data.expiresAt ?? null);
        } else {
          setMsg(data.error ?? "Unable to verify subscription.");
        }
      } catch (err: any) {
        setMsg(err?.message ?? "Unable to verify subscription.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function goToCheckout() {
    const url = new URL("/api/billing/checkout", location.origin);
    url.searchParams.set("return_url", location.origin + "/account");
    // GET endpoint that redirects
    location.href = url.toString();
  }

  async function openPortal() {
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ return_url: location.origin + "/account" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) location.href = data.url;
      else alert(data.error ?? "Could not open billing portal.");
    } catch (e: any) {
      alert(e?.message ?? "Could not open billing portal.");
    }
  }

  const Feature = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-2 w-2 rounded-full bg-current" />
      <span>{children}</span>
    </li>
  );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="mt-4 rounded-lg border p-4">
        {loading ? (
          <p>Checking your subscription…</p>
        ) : (
          <>
            <p className="text-sm text-neutral-600">
              Signed in as <strong>{email ?? "your account"}</strong>
            </p>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-lg">
                  Current plan:{" "}
                  <strong className={isPro ? "text-green-600" : "text-amber-600"}>
                    {isPro ? "PRO" : "FREE"}
                  </strong>
                </p>
                {isPro && expiresAt && (
                  <p className="text-sm text-neutral-500">
                    Renews / Expires: {new Date(expiresAt).toLocaleString()}
                  </p>
                )}
                {msg && (
                  <p className="mt-2 text-sm text-red-600">Note: {msg}</p>
                )}
              </div>

              <div className="flex gap-2">
                {isPro ? (
                  <button
                    onClick={openPortal}
                    className="rounded-md border px-3 py-2"
                  >
                    Manage billing
                  </button>
                ) : (
                  <button
                    onClick={goToCheckout}
                    className="rounded-md border px-3 py-2"
                  >
                    Upgrade to Pro
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 text-lg font-medium">Free features</h2>
          <ul className="space-y-2 text-sm">
            <Feature>Player search and basic stats</Feature>
            <Feature>Recent games view</Feature>
            <Feature>Shareable links</Feature>
          </ul>
        </div>

        <div className={`rounded-lg border p-4 ${isPro ? "" : "opacity-80"}`}>
          <h2 className="mb-2 text-lg font-medium">Pro features</h2>
          <ul className="space-y-2 text-sm">
            <Feature>Advanced filters & KPI grid</Feature>
            <Feature>Save custom views</Feature>
            <Feature>CSV export</Feature>
            <Feature>Priority data refresh</Feature>
          </ul>
          {!isPro && (
            <button
              onClick={goToCheckout}
              className="mt-4 rounded-md border px-3 py-2"
            >
              Unlock Pro
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
