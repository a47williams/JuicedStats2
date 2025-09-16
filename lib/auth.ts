// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  // v5 defaults to JWT sessions; no `session: { strategy: "database" }`
  // Keep `trustHost` out unless you truly need it.
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  // If you keep both, that's fine (AUTH_SECRET / NEXTAUTH_SECRET).
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});
