import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "missing_sig" }, { status: 400 });

    // Use raw body for Stripe signature verification
    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    if (event.type === "checkout.session.completed") {
      const sess: any = event.data.object;
      const email = sess.customer_details?.email || sess.customer_email;
      const plan = String(sess.metadata?.plan ?? "season").toUpperCase(); // "SEASON" | "MONTHLY"

      if (email) {
        const now = new Date();
        const proUntil =
          plan === "SEASON"
            ? new Date(now.getFullYear() + (now.getMonth() > 5 ? 2 : 1), 5, 30, 23, 59, 59) // next Jun 30
            : new Date(now.setMonth(now.getMonth() + 1));

        await prisma.user.upsert({
          where: { email },
          update: { plan, proUntil },
          create: { email, plan, proUntil },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe:webhook] error:", err?.message || err);
    return NextResponse.json({ error: "handler_error" }, { status: 400 });
  }
}
