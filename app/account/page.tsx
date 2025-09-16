// app/account/page.tsx
// app/account/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

// (rest of the file unchanged)

import { auth } from "@/lib/auth";
import UpgradeButton from "./UpgradeButton";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await auth();

  const plan: string = (session?.user as any)?.plan ?? "FREE";
  const isPro = plan === "PRO";

  const checkoutError =
    (typeof searchParams?.error === "string" && searchParams.error) ||
    (typeof searchParams?.checkout_error === "string" &&
      searchParams.checkout_error) ||
    "";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-semibold">Account</h1>

      {!session ? (
        <section className="rounded-lg border p-4">
          <p className="mb-3">You’re not signed in.</p>
          <a
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-white/5"
            href="/api/auth/signin?callbackUrl=/account"
          >
            Sign in with Google
          </a>
        </section>
      ) : (
        <>
          <section className="mb-6 rounded-lg border p-4">
            <p className="text-sm opacity-80">Signed in as your account</p>
            <p className="mt-1">
              <strong>Current plan:</strong>{" "}
              <span className={isPro ? "text-emerald-400" : "text-amber-400"}>
                {plan}
              </span>
            </p>

            {checkoutError ? (
              <p className="mt-2 text-sm text-red-400">
                Checkout failed: {checkoutError}
              </p>
            ) : null}

            {!isPro && (
              <div className="mt-4">
                <UpgradeButton plan="monthly">Upgrade to Pro</UpgradeButton>
              </div>
            )}
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-5">
              <h2 className="mb-2 text-lg font-medium">Free features</h2>
              <ul className="list-inside list-disc space-y-1 text-sm opacity-90">
                <li>Player search and basic stats</li>
                <li>Recent games view</li>
                <li>Shareable links</li>
              </ul>
            </div>

            <div className="rounded-lg border p-5">
              <h2 className="mb-2 text-lg font-medium">Pro features</h2>
              <ul className="list-inside list-disc space-y-1 text-sm opacity-90">
                <li>Advanced filters & KPI grid</li>
                <li>Save custom views</li>
                <li>CSV export</li>
                <li>Priority data refresh</li>
              </ul>

              {!isPro && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <UpgradeButton plan="day">Unlock Pro (Day)</UpgradeButton>
                  <UpgradeButton plan="week">Unlock Pro (Week)</UpgradeButton>
                  <UpgradeButton plan="monthly">
                    Unlock Pro (Monthly)
                  </UpgradeButton>
                  <UpgradeButton plan="season">
                    Unlock Pro (Season)
                  </UpgradeButton>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
