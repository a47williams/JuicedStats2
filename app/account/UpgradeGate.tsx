// app/account/UpgradeGate.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Props = {
  children: React.ReactNode;
  /** When false, the gate will NOT redirect (use this on the Account page). */
  allowRedirect?: boolean;
};

export default async function UpgradeGate({ children, allowRedirect = true }: Props) {
  const session = await auth();
  const plan = (session?.user as any)?.plan ?? "FREE";
  const isPro = plan === "PRO";

  // On pages that are NOT the account page, we can redirect non-pro users
  if (!isPro && allowRedirect) {
    // send them to the Account page where the upgrade UI lives
    redirect("/account?upgrade=1");
  }

  return <>{children}</>;
}
