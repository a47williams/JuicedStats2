"use client";

import { useEffect, useMemo } from "react";

export default function LoginPage() {
  // Force canonical host BEFORE starting OAuth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.hostname.startsWith("www.")) {
      url.hostname = "www." + url.hostname.replace(/^www\./, "");
      if (url.hostname !== window.location.hostname) {
        window.location.replace(url.toString());
      }
    }
  }, []);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.protocol}//${window.location.host}`;
  }, []);

  const callbackUrl = "/account";
  const googleHref = `${origin}/api/auth/signin/google?callbackUrl=${encodeURIComponent(
    callbackUrl
  )}`;

  return (
    <main className="mx-auto max-w-md py-16">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
      <a
        href={googleHref}
        className="inline-flex items-center rounded-md bg-neutral-900 text-white px-4 py-2 dark:bg-white dark:text-neutral-900"
      >
        Continue with Google
      </a>
    </main>
  );
}
