import Link from "next/link";
import InteractiveTrendChart, { type TrendPoint } from "./InteractiveTrendChart";

export default function MetricTrendCard({
  title,
  unit,
  points,
  color,
  href,
}: {
  title: string;
  unit: string;
  points: TrendPoint[];
  color?: string;
  href?: string;
}) {
  if (points.length < 2) return null;

  const card = (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {href && (
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        )}
      </div>
      <InteractiveTrendChart points={points} unit={unit} color={color} />
    </div>
  );

  return href ? (
    <Link href={href} className="active:opacity-70">
      {card}
    </Link>
  ) : (
    card
  );
}
