// app/api/stripe/verify/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get("session_id");

    // If we just returned from Checkout, resolve directly from that session
    if (session_id) {
      const cs = await stripe.checkout.sessions.retrieve(session_id);
      const subId =
        typeof cs.subscription === "string"
          ? cs.subscription
          : cs.subscription?.id;

      const customerId =
        (typeof cs.customer === "string" ? cs.customer : cs.customer?.id) ??
        undefined;

      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const expiresAt = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        return NextResponse.json({
          ok: true,
          plan: "PRO" as const,
          customerId,
          expiresAt,
        });
      }
      // fall through to email path if we didn’t get a sub (rare)
    }

    // Fallback: look up by the signed-in user's email
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ ok: true, plan: "FREE" as const });

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer)
      return NextResponse.json({ ok: true, plan: "FREE" as const });

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });
    const sub = subs.data[0];
    if (!sub)
      return NextResponse.json({
        ok: true,
        plan: "FREE" as const,
        customerId: customer.id,
      });

    const expiresAt = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    return NextResponse.json({
      ok: true,
      plan: "PRO" as const,
      customerId: customer.id,
      expiresAt,
    });
  } catch (err: any) {
    console.error("verify error", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Verify failed" },
      { status: 500 }
    );
  }
}
