// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
// If you use Prisma, uncomment the next two lines and ensure DATABASE_URL in Vercel
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // trust the host header (needed on Vercel)
  trustHost: true,

  // Always pass a secret (read from either AUTH_SECRET or NEXTAUTH_SECRET)
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  // If you’re not using a DB, leave adapter undefined and JWT sessions work fine.
  // adapter: process.env.DATABASE_URL ? PrismaAdapter(prisma) : undefined,

  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // allowDangerousEmailAccountLinking: true, // optional
    }),
  ],

  callbacks: {
    async session({ session, token }) {
      // add whatever you need onto the session here
      // session.user.id = token.sub as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // keep users on same origin
      try {
        const u = new URL(url, baseUrl);
        return u.origin === baseUrl ? u.toString() : baseUrl;
      } catch {
        return baseUrl;
      }
    },
  },
});
