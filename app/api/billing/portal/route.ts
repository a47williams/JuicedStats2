import { NextResponse } from "next/server";
import { stripe, APP_URL } from "@/lib/stripe";
import { auth } from "@/auth";

// Share one handler for both GET and POST to keep callers working
export async function GET() {
  return handler();
}
export async function POST() {
  return handler();
}

async function handler() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find or create the Stripe Customer for this user
  const existing = await stripe.customers.list({ email, limit: 1 });
  const customerId =
    existing.data[0]?.id ??
    (await stripe.customers.create({
      email,
      name: session.user?.name ?? undefined,
    })).id;

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/account`,
  });

  return NextResponse.json({ url: portal.url }, { status: 200 });
}
