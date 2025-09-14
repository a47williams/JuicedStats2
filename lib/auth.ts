// lib/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" }, // or "jwt" if you prefer
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  // if you don't set AUTH_TRUST_HOST in env, keep this:
  trustHost: true,
} satisfies NextAuthConfig;

// export v5 helpers
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
