// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // keep it minimal to rule out adapter/session issues
  secret: process.env.AUTH_SECRET,     // must exist in Vercel
  trustHost: true,
  session: { strategy: "jwt" },        // TEMP: JWT sessions
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        if (u.origin === baseUrl) return u.href; // same-origin only
      } catch {}
      return baseUrl;
    },
  },
});
