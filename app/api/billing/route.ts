// app/api/billing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // TODO: real billing action (create portal session, etc.)
  return NextResponse.json({ ok: true });
}

// Optional — keeps GET from being “undefined” if something calls it.
export async function GET() {
  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
