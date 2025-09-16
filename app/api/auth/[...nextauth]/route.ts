// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
