// app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // your next-auth helper
import { stripe, priceForPlan, baseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
    }

    const url = new URL(req.url);
    const planParam = url.searchParams.get("plan") || "monthly";
    const { id: priceId, plan } = priceForPlan(planParam);

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "hosted",
      allow_promotion_codes: true,
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/account/plan?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/account/plan?cancelled=1`,
      metadata: { plan, email },
      subscription_data: { metadata: { plan, email } },
    });

    return NextResponse.json({ ok: true, url: checkout.url, id: checkout.id });
  } catch (err: any) {
    console.error("checkout error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Checkout failed" },
      { status: 500 }
    );
  }
}
