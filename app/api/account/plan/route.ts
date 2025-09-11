import { NextResponse } from "next/server";
import type { Plan } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    // If not signed in, return a valid JSON payload (avoid client JSON parse errors)
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: true, plan: "FREE" satisfies Plan, proUntil: null, name: null, email: null },
        { status: 200 }
      );
    }

    const email = session.user.email;
    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true, email: true, plan: true, proUntil: true },
    });

    const plan = (user?.plan as Plan) ?? "FREE";
    return NextResponse.json(
      {
        ok: true,
        plan,
        proUntil: user?.proUntil ?? null,
        name: user?.name ?? session.user.name ?? null,
        email: user?.email ?? email,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, plan: "FREE" as Plan, proUntil: null, error: e?.message ?? "Failed to load plan" },
      { status: 200 }
    );
  }
}
