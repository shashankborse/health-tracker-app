import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// This is the public "home page" Google's OAuth verification checks against
// — it must explain the app's purpose and match the app name configured on
// the OAuth consent screen. Signed-in visitors (including the owner's own
// installed home-screen icon, which still points here) are forwarded
// straight into the app so nothing changes for real day-to-day use.
export const metadata = {
  title: "Health Tracker Webapp",
  description:
    "A personal health, fitness, and nutrition tracker for a single owner, with optional Google Health and Drive sync.",
};

export default async function PublicHomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (verifySessionToken(token)) {
    redirect("/home");
  }

  return (
    <main
      className="safe-top safe-bottom mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Health Tracker Webapp</h1>
        <p className="text-base" style={{ color: "var(--muted)" }}>
          A personal health, fitness, and nutrition tracker.
        </p>
      </header>

      <a
        href="/login"
        className="rounded-xl px-4 py-3 text-center text-base font-semibold text-white active:opacity-80"
        style={{ backgroundColor: "var(--accent)" }}
      >
        Continue to app
      </a>

      {/* Full explanation for desktop reviewers; hidden on the phone-sized
          viewport the owner actually uses, so the mobile entry point stays a
          single button rather than a wall of text. */}
      <section className="hidden flex-col gap-4 text-sm leading-relaxed md:flex">
        <div>
          <h2 className="text-lg font-semibold">What this app does</h2>
          <p className="mt-1">
            Health Tracker Webapp is a private, single-owner application for
            logging body weight, workouts (strength training and running),
            and nutrition, and for visualising progress over time. It is
            built and used by one individual for their own personal
            tracking — it is not a public product and does not accept
            sign-ups from other users.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Why it requests Google access</h2>
          <p className="mt-1">
            With the owner&apos;s explicit consent, the app can optionally
            read biometric data (steps, heart rate, heart rate variability,
            respiratory rate, skin temperature, blood oxygen saturation,
            sleep, weight) from the Google Health API, so it can be viewed
            and stored alongside manually logged data. It can also save
            progress photos, exercise recordings, and database backups
            directly to the owner&apos;s own Google Drive, using the narrow{" "}
            <code>drive.file</code> scope, which limits it to only the files
            it creates itself.
          </p>
        </div>

        <p>
          See the{" "}
          <a href="/privacy" style={{ color: "var(--accent)" }}>
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" style={{ color: "var(--accent)" }}>
            Terms of Service
          </a>{" "}
          for full details.
        </p>
      </section>

      <p className="text-xs md:hidden" style={{ color: "var(--muted)" }}>
        <a href="/privacy" style={{ color: "var(--accent)" }}>
          Privacy Policy
        </a>
        {" · "}
        <a href="/terms" style={{ color: "var(--accent)" }}>
          Terms of Service
        </a>
      </p>
    </main>
  );
}
