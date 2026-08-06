export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Health Tracker</h1>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
          >
            Log out
          </button>
        </form>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-neutral-500">
          Phase 1 skeleton is live: the password gate, this placeholder home
          screen, and the Supabase client are wired up. Dashboards, weight
          logging, workouts, and nutrition get built in the phases that
          follow — see <code>SPEC.md</code> in the repo root for the full
          plan.
        </p>
      </section>
    </main>
  );
}
