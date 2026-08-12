type LoginPageProps = {
  searchParams: Promise<{ error?: string; from?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params?.error === "1";
  const from = params?.from ? `?from=${encodeURIComponent(params.from)}` : "";

  return (
    <main
      className="safe-top safe-bottom flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <form
        action={`/api/login${from}`}
        method="POST"
        className="w-full max-w-sm rounded-[1.375rem] bg-card p-8 card-shadow"
      >
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          Health Tracker
        </h1>
        <p className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
          Enter the password to continue.
        </p>

        {hasError && (
          <p
            className="mb-4 rounded-xl px-3 py-2 text-sm font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)",
              color: "var(--danger)",
            }}
          >
            Incorrect password.
          </p>
        )}

        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="mb-4 w-full rounded-xl border px-3 py-3 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        />

        <button
          type="submit"
          className="w-full rounded-[14px] px-3 py-3 text-base font-semibold text-white active:opacity-80"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Log in
        </button>

        <p className="mt-5 text-center text-xs" style={{ color: "var(--muted)" }}>
          <a href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>
          {" · "}
          <a href="/terms" style={{ color: "var(--accent)" }}>Terms of Service</a>
        </p>
      </form>
    </main>
  );
}
