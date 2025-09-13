export async function GET() {
  const has = (k?: string) => !!(k && k.trim().length > 0);

  const present = {
    AUTH_SECRET: has(process.env.AUTH_SECRET),
    NEXTAUTH_SECRET: has(process.env.NEXTAUTH_SECRET),
    GOOGLE_CLIENT_ID: has(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: has(process.env.GOOGLE_CLIENT_SECRET),
    AUTH_URL_or_NEXTAUTH_URL: has(process.env.AUTH_URL ?? process.env.NEXTAUTH_URL),
  };

  const missing = Object.entries(present)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return Response.json({ ok: missing.length === 0, missing, present });
}
