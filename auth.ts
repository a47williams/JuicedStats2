// auth.ts (App Router, NextAuth v5)
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  // When deploying behind Vercel/proxies, this must be on
  trustHost: true,

  // Prisma adapter + your DB
  adapter: PrismaAdapter(prisma),

  // v5 defaults to database sessions if adapter exists; either is fine.
  // session: { strategy: "database" },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // Optional: tighten redirects to your site only
  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const allowed = new URL(process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? baseUrl);
        const next = new URL(url, baseUrl);
        // only allow same-origin redirects
        if (next.origin === allowed.origin) return next.toString();
        return allowed.toString();
      } catch {
        return baseUrl;
      }
    },
  },
});
