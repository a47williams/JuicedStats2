import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto");
  const forwardedHost = h.get("x-forwarded-host");
  const cookieNames = cookies().getAll().map(c => c.name);

  return NextResponse.json({
    at: "probe",
    host,
    proto,
    forwardedHost,
    cookies: cookieNames,
    now: new Date().toISOString(),
  });
}
