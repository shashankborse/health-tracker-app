export default function TermsOfServicePage() {
  return (
    <main
      className="safe-top safe-bottom mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-10 text-sm leading-relaxed"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
      <p style={{ color: "var(--muted)" }}>Last updated: 7 August 2026</p>

      <p>
        Health Tracker is a personal health, fitness, and nutrition tracking
        application built by, and exclusively for, its single owner. These
        terms exist to satisfy Google API OAuth verification requirements
        and describe the app&apos;s intended, single-user use.
      </p>

      <h2 className="mt-2 text-lg font-semibold">Use of the service</h2>
      <p>
        This application is not available to the public and does not accept
        new users. It exists solely for the owner to track their own
        weight, workouts, nutrition, and Google Health-sourced biometric
        data.
      </p>

      <h2 className="mt-2 text-lg font-semibold">No medical advice</h2>
      <p>
        This app is a personal tracking tool, not a medical device. Nothing
        it displays — including any computed readiness score — constitutes
        medical advice, diagnosis, or treatment. Consult a qualified
        healthcare professional for medical concerns.
      </p>

      <h2 className="mt-2 text-lg font-semibold">No warranty</h2>
      <p>
        This app is provided as-is, with no warranty of any kind, express or
        implied, including as to accuracy, availability, or fitness for a
        particular purpose. As a free-tier, single-user personal project, it
        may experience downtime or data issues without notice.
      </p>

      <h2 className="mt-2 text-lg font-semibold">Data and third-party services</h2>
      <p>
        Use of this app&apos;s Google Health API and Google Drive
        integrations is subject to Google&apos;s own terms of service and
        privacy policies, in addition to this app&apos;s{" "}
        <a href="/privacy" style={{ color: "var(--accent)" }}>
          Privacy Policy
        </a>
        .
      </p>

      <h2 className="mt-2 text-lg font-semibold">Changes to these terms</h2>
      <p>
        These terms may be updated as the application&apos;s features
        change. The &quot;Last updated&quot; date above reflects the most
        recent revision.
      </p>

      <h2 className="mt-2 text-lg font-semibold">Contact</h2>
      <p>
        Questions about these terms can be directed to the app owner at{" "}
        <a href="mailto:shashank.borse@olivegroup.io" style={{ color: "var(--accent)" }}>
          shashank.borse@olivegroup.io
        </a>
        .
      </p>
    </main>
  );
}
