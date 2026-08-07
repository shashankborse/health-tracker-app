import InteractiveTrendChart, { type TrendPoint } from "./InteractiveTrendChart";

export default function MetricTrendCard({
  title,
  unit,
  points,
  color,
}: {
  title: string;
  unit: string;
  points: TrendPoint[];
  color?: string;
}) {
  if (points.length < 2) return null;
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <InteractiveTrendChart points={points} unit={unit} color={color} />
    </div>
  );
}
