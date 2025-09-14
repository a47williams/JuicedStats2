// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Accept both v5 and legacy v4 env names
const GOOGLE_ID =
  process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_SECRET =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
const AUTH_SECRET =
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
const AUTH_URL = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";

// Fail fast with a clear message in logs if something is missing
const missing: string[] = [];
if (!GOOGLE_ID) missing.push("AUTH_GOOGLE_ID or GOOGLE_CLIENT_ID");
if (!GOOGLE_SECRET) missing.push("AUTH_GOOGLE_SECRET or GOOGLE_CLIENT_SECRET");
if (!AUTH_SECRET) missing.push("AUTH_SECRET or NEXTAUTH_SECRET");
if (!process.env.AUTH_TRUST_HOST) {
  // not required, but recommended on Vercel
  // we don't push it to `missing`, just info
  console.warn("AUTH_TRUST_HOST not set; defaulting to true on Vercel.");
}
if (missing.length) {
  throw new Error(
    `NextAuth config error: missing env(s): ${missing.join(", ")}`
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: AUTH_SECRET,
  // Vercel/Cloud proxy host handling
  trustHost: true,
  providers: [
    Google({
      clientId: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
    }),
  ],
});
