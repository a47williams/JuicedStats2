// app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe, APP_URL } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// NOTE: Stripe requires you to configure the Customer Portal in Dashboard (test mode)
// Dashboard → Settings → Billing → Customer portal → Save (creates default configuration)

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // Create/find a customer by email (simple approach for MVP)
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer =
      customers.data[0] ??
      (await stripe.customers.create({
        email,
        metadata: { appUserId: session?.user?.id || "" },
      }));

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${APP_URL}/account`,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (err: any) {
    console.error("[portal] error:", err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
