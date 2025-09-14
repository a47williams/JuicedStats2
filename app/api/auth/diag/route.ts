// app/api/auth/diag/route.ts
import { NextResponse } from "next/server";

export function GET() {
  const flags = {
    AUTH_URL: !!process.env.AUTH_URL,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: !!process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: !!process.env.AUTH_GOOGLE_SECRET,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "(unset)",
  };
  return NextResponse.json({ ok: true, env: flags });
}
