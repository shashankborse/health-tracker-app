import type { WeightEntry } from "@/lib/types";
import InteractiveTrendChart from "./InteractiveTrendChart";
import Card from "./Card";

export default function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) {
    return (
      <Card className="flex h-[140px] items-center justify-center px-6 text-center text-sm" style={{ color: "var(--muted)" }}>
        Log a few entries to see your trend.
      </Card>
    );
  }

  const latest = entries[entries.length - 1].weight_kg;
  const change = latest - entries[0].weight_kg;
  const changeLabel = `${change > 0 ? "+" : ""}${change.toFixed(1)} kg`;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight tabular-nums">{latest.toFixed(1)} kg</span>
        <span className="text-sm font-medium tabular-nums" style={{ color: "var(--muted)" }}>
          {changeLabel} over {entries.length} entries
        </span>
      </div>
      <InteractiveTrendChart
        points={entries.map((e) => ({ date: e.entry_date, value: e.weight_kg }))}
        unit="kg"
      />
    </Card>
  );
}
