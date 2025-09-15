// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  // debug: true, // enable after this step only if needed
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        if (u.origin === baseUrl) return u.href; // same-origin only
      } catch {}
      return baseUrl; // fallback
    },
  },
});
