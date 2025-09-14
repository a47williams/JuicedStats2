// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
// If you use Prisma:
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma"; // change if your prisma path differs

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // If you use Prisma, keep the adapter. Otherwise, remove the adapter line.
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    // add other providers here
  ],

  // Optional: tighten callbacks as needed
  callbacks: {
    async jwt({ token, account, profile }) {
      // attach anything you need on the token here
      return token;
    },
    async session({ session, token }) {
      // expose token fields on session here
      return session;
    },
  },

  // Important in prod
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});
