// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // keep it minimal while we stabilize sign-in
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" }, // TEMP: we’ll switch back to DB sessions after login works
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
        if (u.origin === baseUrl) return u.href;
      } catch {}
      return baseUrl;
    },
  },
});
