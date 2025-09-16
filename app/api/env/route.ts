// app/api/_env/route.ts
import { headers } from "next/headers";

export async function GET() {
  const h = headers();
  const data = {
    host: h.get("host"),
    auth_url: process.env.AUTH_URL || null,
    nextauth_url: process.env.NEXTAUTH_URL || null,
    public_app_url: process.env.NEXT_PUBLIC_APP_URL || null,
    node_env: process.env.NODE_ENV || null,
    ts: new Date().toISOString(),
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
