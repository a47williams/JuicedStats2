// ✅ add at top of the file
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

type Plan = "FREE" | "MONTHLY" | "SEASON";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "missing session_id" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "line_items.data.price.product"],
    });

    const customer = session.customer as Stripe.Customer | null;
    const email =
      session.customer_details?.email ||
      (customer && "email" in customer ? customer.email : null);

    if (!email) {
      return NextResponse.json({ ok: false, error: "no email on session" }, { status: 400 });
    }

    // Decide plan from session mode: subscription = MONTHLY, one-time = SEASON
    const plan: Plan = session.mode === "subscription" ? "MONTHLY" : "SEASON";

    // If you want a hard season end date for SEASON:
    const seasonEnd =
      session.mode === "subscription"
        ? null
        : new Date(process.env.SEASON_END_UTC ?? "2026-06-30T23:59:59Z").toISOString();

    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      create: {
        email: email.toLowerCase(),
        name: session.customer_details?.name || "User",
        plan,
        proUntil: seasonEnd,
      },
      update: {
        plan,
        proUntil: seasonEnd,
      },
      select: { plan: true, proUntil: true },
    });

    return NextResponse.json({ ok: true, plan: user.plan, proUntil: user.proUntil });
  } catch (err: any) {
    console.error("[stripe/verify] error", err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
