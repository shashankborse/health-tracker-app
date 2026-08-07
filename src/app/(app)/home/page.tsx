import Link from "next/link";

const SECTIONS = [
  {
    href: "/weight",
    title: "Weight",
    description: "Log today's weight and see your trend.",
    icon: (
      <path d="M12 3v2M7 5h10l1.5 14.5a2 2 0 0 1-2 2.5H7.5a2 2 0 0 1-2-2.5L7 5ZM9 10a3 3 0 0 0 6 0" />
    ),
  },
  {
    href: "/workouts",
    title: "Workouts",
    description: "This week's plan — strength, running, and recovery days.",
    icon: (
      <path d="M6.5 8.5 4 11l2.5 2.5M17.5 8.5 20 11l-2.5 2.5M7 11h10M8 8v6M16 8v6" />
    ),
  },
  {
    href: "/health",
    title: "Health",
    description: "Fitbit-sourced biometrics via Google Health.",
    icon: (
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10.2-7.5 10.2ZM8 12h1.5l1-2 1.5 3.5 1-1.5H15" />
    ),
  },
];

export default function Home() {
  return (
    <main className="flex flex-col gap-6 px-4 pt-6">
      <header className="flex items-center justify-between px-1">
        <h1 className="text-3xl font-bold tracking-tight">Health Tracker</h1>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="text-sm font-medium"
            style={{ color: "var(--accent)" }}
          >
            Log out
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm active:opacity-70"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
            >
              <svg
                viewBox="0 0 24 24"
                width={22}
                height={22}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {section.icon}
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold">{section.title}</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {section.description}
              </p>
            </div>
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        ))}
      </section>
    </main>
  );
}
