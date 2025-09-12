// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Export everything NextAuth v5 gives us, including `handlers`
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // carry custom fields to the token (our Prisma User includes these)
        // @ts-ignore
        token.uid = user.id;
        // @ts-ignore
        token.plan = (user as any).plan ?? "FREE";
        // @ts-ignore
        token.proUntil = (user as any).proUntil ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // @ts-ignore
        session.user.id = (token as any).uid as string;
        // @ts-ignore
        session.user.plan = (token as any).plan ?? "FREE";
        // @ts-ignore
        session.user.proUntil = (token as any).proUntil ?? null;
      }
      return session;
    },
  },
});
