export default function PrivacyPolicyPage() {
  return (
    <main
      className="safe-top safe-bottom mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-10 text-sm leading-relaxed"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
      <p style={{ color: "var(--muted)" }}>Last updated: 7 August 2026</p>

      <p>
        Health Tracker is a personal health, fitness, and nutrition tracking
        application built and used by a single individual (&quot;the
        owner&quot;) for their own private use. It is not a public product,
        does not accept sign-ups from other users, and is not operated as a
        commercial service.
      </p>

      <h2 className="mt-2 text-lg font-semibold">What data this app accesses</h2>
      <p>With your (the owner&apos;s) explicit consent via Google OAuth, this app reads:</p>
      <ul className="list-disc pl-5">
        <li>
          Health and fitness data from the Google Health API: steps, resting
          heart rate, heart rate variability, respiratory rate, skin
          temperature, blood oxygen saturation, sleep stages, weight, and
          body fat percentage.
        </li>
        <li>
          Google Drive access limited to the narrow <code>drive.file</code>{" "}
          scope — this app can only see and manage files that it itself
          creates in your Drive (progress photos, exercise recordings, and
          database backups). It cannot see or access any other file in your
          Drive.
        </li>
      </ul>

      <h2 className="mt-2 text-lg font-semibold">Where data is stored</h2>
      <ul className="list-disc pl-5">
        <li>
          Structured health, workout, and nutrition data is stored in a
          private Supabase (PostgreSQL) database, accessible only via
          server-side credentials that never leave the application server.
        </li>
        <li>
          Photos, exercise recordings, and database backup files are
          uploaded directly to the owner&apos;s own Google Drive. This
          application&apos;s database never stores the photo or video
          content itself — only a reference link to the file in Drive.
        </li>
      </ul>

      <h2 className="mt-2 text-lg font-semibold">Who can access this data</h2>
      <p>
        Only the owner. The application is protected by a single shared
        password known only to the owner, and there is no multi-user account
        system. Data is never sold, shared, or provided to any third party,
        and is never used for advertising.
      </p>

      <h2 className="mt-2 text-lg font-semibold">Third-party infrastructure</h2>
      <p>This app runs on the following infrastructure providers, each processing data only as needed to operate the app:</p>
      <ul className="list-disc pl-5">
        <li>Vercel — application hosting.</li>
        <li>Supabase — database hosting.</li>
        <li>Google (Health API, Drive API) — as described above.</li>
      </ul>

      <h2 className="mt-2 text-lg font-semibold">Data deletion</h2>
      <p>
        The owner can disconnect the Google Health/Drive integration at any
        time, which stops all further data access. Because this is a
        single-owner personal tool, data deletion requests are handled
        directly by the owner deleting rows from the database or files from
        Drive.
      </p>

      <h2 className="mt-2 text-lg font-semibold">Changes to this policy</h2>
      <p>
        This policy may be updated as the application&apos;s features
        change. The &quot;Last updated&quot; date above reflects the most
        recent revision.
      </p>

      <h2 className="mt-2 text-lg font-semibold">Contact</h2>
      <p>
        Questions about this policy can be directed to the app owner at{" "}
        <a href="mailto:me@shashankborse.com" style={{ color: "var(--accent)" }}>
          me@shashankborse.com
        </a>
        .
      </p>
    </main>
  );
}
