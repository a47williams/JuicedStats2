// NextAuth v5 route re-export
import { handlers } from "@/auth";

// Re-export the GET/POST handlers produced by NextAuth()
export const GET = handlers.GET;
export const POST = handlers.POST;
