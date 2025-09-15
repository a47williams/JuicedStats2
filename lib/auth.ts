// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { auth, signIn, signOut, handlers } = NextAuth({
  trustHost: true,
  session: { strategy: "database" },
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Canonical host from env or current baseUrl
      const canonical = new URL(process.env.NEXTAUTH_URL ?? baseUrl);

      // Support relative URLs from NextAuth
      const target = url.startsWith("/")
        ? new URL(url, canonical)
        : new URL(url);

      // Never leave the canonical origin (prevents cross-host PKCE cookie loss)
      if (target.origin !== canonical.origin) {
        return canonical.toString();
      }
      return target.toString();
    },
  },
});
