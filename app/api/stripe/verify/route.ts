// app/api/stripe/verify/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
      return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    const checkout = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "line_items.data.price"],
    });

    const sub: any = checkout.subscription;

    return NextResponse.json({
      ok: true,
      plan:
        sub?.items?.data?.[0]?.price?.id === process.env.STRIPE_PRICE_PRO
          ? "PRO"
          : "FREE",
      customerId: checkout.customer,
      expiresAt: sub?.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Verify failed" }, { status: 500 });
  }
}
