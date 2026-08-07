"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
};

const strokeIcon = (path: string, active: boolean) => (
  <svg
    viewBox="0 0 24 24"
    width={26}
    height={26}
    fill="none"
    stroke={active ? "var(--accent)" : "var(--muted)"}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={path} />
  </svg>
);

const TABS: Tab[] = [
  {
    href: "/",
    label: "Home",
    icon: (active) =>
      strokeIcon("M4 11.5 12 4l8 7.5M6 10v9h12v-9", active),
  },
  {
    href: "/weight",
    label: "Weight",
    icon: (active) =>
      strokeIcon(
        "M12 3v2M7 5h10l1.5 14.5a2 2 0 0 1-2 2.5H7.5a2 2 0 0 1-2-2.5L7 5ZM9 10a3 3 0 0 0 6 0",
        active
      ),
  },
  {
    href: "/workouts",
    label: "Workouts",
    icon: (active) =>
      strokeIcon(
        "M6.5 8.5 4 11l2.5 2.5M17.5 8.5 20 11l-2.5 2.5M7 11h10M8 8v6M16 8v6",
        active
      ),
  },
  {
    href: "/health",
    label: "Health",
    icon: (active) =>
      strokeIcon(
        "M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10.2-7.5 10.2ZM8 12h1.5l1-2 1.5 3.5 1-1.5H15",
        active
      ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 border-t border-border bg-card/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5"
            >
              {tab.icon(active)}
              <span
                className="text-[11px] font-medium"
                style={{ color: active ? "var(--accent)" : "var(--muted)" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
