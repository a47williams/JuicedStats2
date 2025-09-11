// lib/auth.ts (v5 shim)
// Keep any session type augmentation you want, but DO NOT import NextAuthOptions.

import type { DefaultSession } from "next-auth";

// Optional: augment the Session shape your app uses
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      plan?: string;
      proUntil?: string | null;
    };
  }
}

// Re-export the v5 helpers from the root auth.ts
export { handlers, auth, signIn, signOut } from "@/auth";
