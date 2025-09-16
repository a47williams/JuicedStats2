// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

export const GET = handlers.GET;
export const POST = handlers.POST;

// Ensure Node runtime (Prisma adapter needs Node)
export const runtime = "nodejs";
