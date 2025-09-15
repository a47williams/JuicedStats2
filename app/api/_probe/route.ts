// app/api/_probe/route.ts
import { headers, cookies } from "next/headers";

export async function GET() {
  const h = headers();
  const info = {
    host: h.get("host"),
    proto: h.get("x-forwarded-proto"),
    forwardedHost: h.get("x-forwarded-host"),
    path: new URL(h.get("x-url") || "/", "http://x").pathname,
    cookies: cookies().getAll().map(c => c.name),
    ts: new Date().toISOString(),
  };
  return new Response(JSON.stringify(info, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
