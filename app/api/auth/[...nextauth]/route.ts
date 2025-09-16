// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
