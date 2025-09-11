// app/api/billing/portal/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find or create a Stripe Customer by email
  const list = await stripe.customers.list({ email, limit: 1 });
  const existing = list.data[0];
  const customer = existing ?? (await stripe.customers.create({ email }));

  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account`,
  });

  return NextResponse.json({ url: portal.url });
}
