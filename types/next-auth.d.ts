// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      plan?: string | null;
      proUntil?: string | Date | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    plan?: string | null;
    proUntil?: string | Date | null;
  }
}
