// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

// Re-export the GET and POST handlers for Next.js route typing
export const { GET, POST } = handlers;
