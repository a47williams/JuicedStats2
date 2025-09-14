// app/api/billing/portal/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { return_url, customer } = await req.json();

  const portal = await stripe.billingPortal.sessions.create({ customer, return_url });
  return NextResponse.json({ url: portal.url });
}
