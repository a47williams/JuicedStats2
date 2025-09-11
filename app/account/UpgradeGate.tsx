"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * If a logged-out user lands on /account?upgrade=1, send them to Sign In.
 */
export default function UpgradeGate({
  isLoading,
  userEmail,
}: {
  isLoading: boolean;
  userEmail: string | null;
}) {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const wantsUpgrade = sp.get("upgrade") === "1";
    if (!isLoading && wantsUpgrade && !userEmail) {
      const cb = "/account?upgrade=1";
      router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent(cb)}`);
    }
  }, [sp, isLoading, userEmail, router]);

  return null;
}
