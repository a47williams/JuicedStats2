// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

export const GET = handlers.GET;
export const POST = handlers.POST;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
