// app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = new URL(req.url).origin;

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_PRO!, quantity: 1 }],
    success_url: `${base}/account/plan?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/account/plan`,
    metadata: { userEmail: session.user.email },
  });

  return NextResponse.redirect(checkout.url!, { status: 303 });
}
