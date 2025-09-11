import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plan = "FREE" | "SEASON" | "MONTHLY";

function normalizePlan(plan: Plan | null | undefined, proUntil: Date | null | undefined): Plan {
  if (!proUntil || isNaN(proUntil.getTime()) || proUntil.getTime() <= Date.now()) return "FREE";

  // If DB says MONTHLY but proUntil looks like end-of-season (legacy bug), treat as SEASON for display.
  const m = proUntil.getMonth(); // 0=Jan
  const d = proUntil.getDate();
  const looksSeasonEnd = m === 5 && d >= 25 && d <= 30; // late June
  if ((plan === "MONTHLY" || plan === null || plan === undefined) && looksSeasonEnd) return "SEASON";

  return (plan as Plan) ?? "FREE";
}

export async function GET() {
  try {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const name = session?.user?.name ?? null;

    if (!email) {
      return NextResponse.json({ ok: true, plan: "FREE", proUntil: null, name, email });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    const rawPlan = (user?.plan as Plan | undefined) ?? "FREE";
    const rawUntil = user?.proUntil ? new Date(user.proUntil) : null;
    const plan = normalizePlan(rawPlan, rawUntil);

    return NextResponse.json({
      ok: true,
      plan,
      proUntil: rawUntil,
      name,
      email,
    });
  } catch (err: any) {
    console.error("[/api/account/plan] error", err?.message || err);
    return NextResponse.json({ ok: true, plan: "FREE", proUntil: null }, { status: 200 });
  }
}
