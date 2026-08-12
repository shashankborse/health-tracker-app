import Link from "next/link";

const EXPORTS = [
  { href: "/api/export/weight", title: "Weight history", description: "Every logged weight entry, one row per day." },
  { href: "/api/export/workouts", title: "Workout history", description: "Every logged set and run, one row each." },
  { href: "/api/export/nutrition", title: "Nutrition history", description: "Every logged food entry with its macros." },
];

export default function ExportPage() {
  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center gap-2 px-1">
        <Link href="/home" aria-label="Back to Home" className="active:opacity-60">
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
      </div>

      <p className="px-1 text-sm" style={{ color: "var(--muted)" }}>
        Download your history as a CSV file — a personal backup/safety net, separate from the automated Drive backup.
      </p>

      <div className="flex flex-col gap-3">
        {EXPORTS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            download
            className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm active:opacity-70"
          >
            <div>
              <p className="text-base font-semibold">{item.title}</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {item.description}
              </p>
            </div>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14" />
            </svg>
          </a>
        ))}
      </div>
    </main>
  );
}
