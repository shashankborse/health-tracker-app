import type { WeightEntry } from "@/lib/types";
import InteractiveTrendChart from "./InteractiveTrendChart";

export default function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-2xl bg-card px-6 text-center text-sm shadow-sm" style={{ color: "var(--muted)" }}>
        Log a few entries to see your trend.
      </div>
    );
  }

  const latest = entries[entries.length - 1].weight_kg;
  const change = latest - entries[0].weight_kg;
  const changeLabel = `${change > 0 ? "+" : ""}${change.toFixed(1)} kg`;

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight">{latest.toFixed(1)} kg</span>
        <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          {changeLabel} over {entries.length} entries
        </span>
      </div>
      <InteractiveTrendChart
        points={entries.map((e) => ({ date: e.entry_date, value: e.weight_kg }))}
        unit="kg"
      />
    </div>
  );
}
