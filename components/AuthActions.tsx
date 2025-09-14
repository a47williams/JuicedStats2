// components/AuthActions.tsx
import { signIn, signOut } from "@/lib/auth";

export function SignInAction() {
  async function doSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }
  return (
    <form action={doSignIn}>
      <button className="px-3 py-2 rounded-md border">Sign in with Google</button>
    </form>
  );
}

export function SignOutAction() {
  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }
  return (
    <form action={doSignOut}>
      <button className="px-3 py-2 rounded-md border">Sign out</button>
    </form>
  );
}
