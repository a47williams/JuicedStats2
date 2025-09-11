"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import VerifyAfterCheckout from "./VerifyAfterCheckout";
import { proFeaturesEnabled, type Plan } from "@/lib/flags";

type PlanResp = {
  ok: boolean;
  plan: Plan;
  proUntil?: string | null;
  name?: string | null;
  email?: string | null;
};

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" }) {
  const tones: Record<string, string> = {
    neutral: "bg-neutral-900/40 border border-neutral-800 text-neutral-200",
    success: "bg-green-900/20 border border-green-600/50 text-green-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan>("FREE");
  const [proUntil, setProUntil] = useState<Date | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ctaLoading, setCtaLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function refreshPlan() {
    try {
      setLoading(true);
      const res = await fetch("/api/account/plan", { cache: "no-store" });
      const txt = await res.text();
      const data: PlanResp = JSON.parse(txt);
      setPlan((data?.plan as Plan) ?? "FREE");
      setProUntil(data?.proUntil ? new Date(data.proUntil) : null);
      setUserName(data?.name ?? null);
      setUserEmail(data?.email ?? null);
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not load plan info.");
      setPlan("FREE");
      setProUntil(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshPlan();
    const onUpd = () => refreshPlan();
    window.addEventListener("juicedstats:plan-updated", onUpd);
    return () => window.removeEventListener("juicedstats:plan-updated", onUpd);
  }, []);

  const badge = plan === "FREE" ? <Pill>Free</Pill> : plan === "SEASON" ? <Pill tone="success">Pro — Season</Pill> : <Pill tone="success">Pro — Monthly</Pill>;

  async function startCheckout() {
    try {
      setCtaLoading(true);
      setErrorMsg("");
      const res = await fetch(`/api/billing/checkout?plan=season`, { headers: { Accept: "application/json" } });
      const txt = await res.text();
      const data = JSON.parse(txt);
      if (!res.ok || !data?.url) throw new Error(data?.error || "Upgrade failed to initialize.");
      window.location.href = data.url as string;
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not start checkout.");
    } finally {
      setCtaLoading(false);
    }
  }

  async function openPortal() {
    try {
      setPortalLoading(true);
      setErrorMsg("");
      const res = await fetch(`/api/billing/portal`, { headers: { Accept: "application/json" } });
      const txt = await res.text();
      const data = JSON.parse(txt);
      if (!res.ok || !data?.url) throw new Error(data?.error || "Could not open billing portal.");
      window.location.href = data.url as string;
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  const proActive = proFeaturesEnabled(plan);

  return (
    <div className="space-y-6">
      {/* ✅ Wrap anything that uses useSearchParams in Suspense */}
      <Suspense fallback={null}>
        <VerifyAfterCheckout />
      </Suspense>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h1 className="text-2xl font-semibold mb-4">Account</h1>

        <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold">
              <span>{(userName?.[0] || userEmail?.[0] || "J").toUpperCase()}</span>
            </div>
            <div className="text-sm">
              <div className="font-medium">{userName || "Signed in"}</div>
              <div className="text-neutral-400">{userEmail || "—"}</div>
            </div>
          </div>
          <div>{badge}</div>
        </div>

        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/40">
          <div className="p-4 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Plan</div>
              <div className="flex gap-2">
                <Link href="/" className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-900">
                  ← Back to Research
                </Link>
                <button onClick={refreshPlan} className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-900">
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
                {plan === "MONTHLY" && (
                  <button
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {portalLoading ? "Opening…" : "Manage Billing"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="text-sm text-neutral-400 mb-1">Current Plan</div>
              <div className="text-lg font-semibold mb-1">
                {plan === "FREE" ? "Free" : plan === "SEASON" ? "Pro — Season" : "Pro — Monthly"}
              </div>
              {plan !== "FREE" && proUntil ? (
                <div className="text-xs text-neutral-400">
                  Active until <span className="text-neutral-200">{proUntil.toLocaleDateString()}</span>
                </div>
              ) : (
                <div className="text-xs text-neutral-400">You’re on the free tier.</div>
              )}
              {errorMsg && <div className="mt-3 text-xs text-red-400">{errorMsg}</div>}
              {!proActive && (
                <div className="mt-3 text-xs text-neutral-400">
                  Pro features unlock on <span className="text-neutral-200">Oct 1</span> for Pro members.
                </div>
              )}
            </div>

            {/* Value bullets (expanded) */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="text-sm text-neutral-400 mb-2">Pro features</div>
              <ul className="space-y-1.5 text-sm">
                <li>• Full season logs (no cap)</li>
                <li>• Advanced filters: <span className="font-medium">Min Minutes, Opponent, Rest</span></li>
                <li>• <span className="font-medium">EV / $100</span> (expected profit per $100 bet)</li>
                <li>• <span className="font-medium">Confidence</span> (probability your edge is +EV)</li>
                <li>• <span className="font-medium">Fair Line</span> model vs book line</li>
                <li>• <span className="font-medium">Edge Finder</span> highlights (L10, home/away, matchup)</li>
                <li>• <span className="font-medium">CSV Export</span> for logs</li>
                <li>• <span className="font-medium">Save Views</span> for quick recall</li>
                <li>• Higher usage limits during busy slates</li>
              </ul>
              <div className="mt-3 text-xs text-neutral-400">
                During open beta, these are visible to everyone. Starting <span className="text-neutral-200">Oct 1</span>, they’ll require Pro.
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 flex flex-col justify-between">
              <div>
                <div className="text-sm text-neutral-400 mb-1">Upgrade</div>
                <div className="text-lg font-semibold mb-2">Pro — Season Pass</div>
                <div className="text-xs text-neutral-400">
                  One-time purchase for the season. Billing portal appears if you switch to Monthly later.
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {plan === "FREE" ? (
                  <button
                    onClick={startCheckout}
                    disabled={ctaLoading}
                    className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:opacity-90 disabled:opacity-50"
                  >
                    {ctaLoading ? "Starting checkout…" : "Upgrade to Pro — Season"}
                  </button>
                ) : (
                  <button disabled className="w-full rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-400">
                    You’re already Pro
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-neutral-500">
          Have a code? Enter it at Stripe Checkout (e.g., <span className="text-neutral-300">EARLYBIRD25</span>).
        </div>
      </div>
    </div>
  );
}
