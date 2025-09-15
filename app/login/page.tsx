// app/login/page.tsx
export default function LoginPage() {
  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Sign in</h1>
      <p>Temporary static login page for debugging.</p>
      <p>
        <a href="/api/auth/signin/google?callbackUrl=%2Faccount">Continue with Google</a>
      </p>
    </main>
  );
}
