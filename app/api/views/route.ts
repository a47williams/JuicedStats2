import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Save a view for the signed-in user.
 * Body: { name: string, params: object }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.name !== "string" || typeof body.params !== "object") {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const name = body.name.trim().slice(0, 64);
    const params = JSON.stringify(body.params);

    // Ensure user row exists (plan defaults to FREE if new)
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, plan: "FREE", proUntil: null },
    });

    // Create the saved view (SQLite-friendly: params is a String column)
    const view = await prisma.view.create({
      data: {
        name,
        params,
        // Prefer userId if your View model has it; if not, remove this line in schema
        userId: user.id,
      } as any, // cast to allow both schemas (with/without userId) to compile
    });

    return NextResponse.json({ ok: true, view });
  } catch (e: any) {
    console.error("[/api/views POST] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * List the most recent views for the signed-in user.
 * Returns: { ok: true, views: Array<{id,name,createdAt,params}> }
 */
export async function GET() {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ ok: true, views: [] });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: true, views: [] });

    // Try by userId if available; if your schema uses a different field, adapt here.
    const views = await prisma.view.findMany({
      where: { userId: user.id } as any,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, createdAt: true, params: true },
    });

    return NextResponse.json({ ok: true, views });
  } catch (e: any) {
    console.error("[/api/views GET] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * Optional: delete a saved view by id (?id=...)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

    // Make sure the view belongs to the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Delete if owned. If your schema doesn't have userId, remove that condition.
    await prisma.view.delete({
      where: { id: Number(id) } as any,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[/api/views DELETE] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
