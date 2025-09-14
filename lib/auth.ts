// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // support either the v5 AUTH_* names or your existing GOOGLE_* names
      clientId:
        process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  // REQUIRED in production
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});
