// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

type Body = Partial<{
  mode: "season" | "monthly";
  successUrl: string;
  cancelUrl: string;
  coupon: string; // optional, still allow promo codes in Checkout
}>;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const selected = body.mode ?? "season";

  const seasonPrice = process.env.STRIPE_PRICE_SEASON!;
  const monthlyPrice = process.env.STRIPE_PRICE_MONTHLY!;
  const priceId = selected === "monthly" ? monthlyPrice : seasonPrice;

  const isSubscription = selected === "monthly";

  const success_url =
    body.successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/account?success=1`;
  const cancel_url =
    body.cancelUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/account?canceled=1`;

  // 👇 Explicit type so TS knows `mode` is valid at the top level
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: isSubscription ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: session.user.email,
    allow_promotion_codes: true,
    success_url,
    cancel_url,
    metadata: {
      purchase_mode: selected,
      userEmail: session.user.email,
    },
  };

  const checkout = await stripe.checkout.sessions.create(params);
  return NextResponse.json({ id: checkout.id, url: checkout.url }, { status: 200 });
}
