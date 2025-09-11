"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Runs ONLY when URL has ?checkout=success&session_id=...
 * Calls /api/stripe/verify to upsert plan + proUntil, then cleans the URL.
 * Emits window event 'juicedstats:plan-updated' so the Account page can refresh.
 */
export default function VerifyAfterCheckout() {
  const sp = useSearchParams();
  const router = useRouter();

  const checkout = sp.get("checkout");
  const sessionId = sp.get("session_id");

  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "err" | "info">("info");

  useEffect(() => {
    if (checkout !== "success" || !sessionId) return;

    let cancelled = false;

    (async () => {
      try {
        if (cancelled) return;
        setMsg("Confirming your purchase…");
        setTone("info");

        const res = await fetch(`/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (res.ok && data?.ok) {
          setTone("ok");
          setMsg("Purchase verified — you’re Pro!");
          // Tell listeners (Account page) to refresh plan
          window.dispatchEvent(new CustomEvent("juicedstats:plan-updated"));
        } else {
          setTone("err");
          setMsg("Could not verify purchase.");
        }
      } catch {
        if (!cancelled) {
          setTone("err");
          setMsg("Could not verify purchase.");
        }
      } finally {
        // Clean the URL params after a short delay
        setTimeout(() => {
          if (cancelled) return;
          const url = new URL(window.location.href);
          url.searchParams.delete("checkout");
          url.searchParams.delete("session_id");
          router.replace(url.pathname + (url.search ? `?${url.searchParams.toString()}` : "") + url.hash);
        }, 1500);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkout, sessionId, router]);

  if (!msg) return null;

  const cls =
    tone === "ok"
      ? "bg-green-900/20 border-green-600/50 text-green-200"
      : tone === "err"
      ? "bg-red-900/20 border-red-600/50 text-red-200"
      : "bg-neutral-900/40 border-neutral-800 text-neutral-200";

  return (
    <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${cls}`}>
      {msg}
    </div>
  );
}
