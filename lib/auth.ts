import type { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
declare module "next-auth" {
  interface Session extends DefaultSession { user: DefaultSession["user"] & { id: string } }
}
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [ GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || "unset", clientSecret: process.env.GOOGLE_CLIENT_SECRET || "unset" }) ],
  callbacks: { async session({ session, token }) { if (session.user) (session.user as any).id = token.sub!; return session; } },
};