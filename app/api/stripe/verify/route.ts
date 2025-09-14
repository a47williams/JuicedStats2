// app/api/stripe/verify/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const sub = session.subscription as Stripe.Subscription | null;
    const expiresAt =
      sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

    return NextResponse.json({
      ok: true,
      plan: "PRO",
      customerId: (session.customer as string) || null,
      expiresAt,
    });
  } catch (err: any) {
    console.error("verify error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Verify failed" },
      { status: 500 }
    );
  }
}
