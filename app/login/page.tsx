// app/login/page.tsx
export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="mb-4 text-2xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm opacity-80">
        Choose a provider to continue.
      </p>

      <a
        href="/api/auth/signin/google?callbackUrl=/account"
        className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-white/5"
      >
        Continue with Google
      </a>
    </main>
  );
}
