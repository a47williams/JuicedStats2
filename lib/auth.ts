// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  // TEMP: turn on if you want verbose logs in Vercel while debugging
  // debug: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // IMPORTANT: never change host — only allow same-origin redirects
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        // keep same-origin (e.g., https://www.juicedstats.com)
        if (u.origin === baseUrl) return u.href;
      } catch {
        /* noop */
      }
      return baseUrl; // fallback to site root on the correct host
    },
  },
});
