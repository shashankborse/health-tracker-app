import type { WeightEntry } from "@/lib/types";

const WIDTH = 320;
const HEIGHT = 140;
const PADDING = 24;

export default function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-2xl bg-card px-6 text-center text-sm shadow-sm" style={{ color: "var(--muted)" }}>
        Log a few entries to see your trend.
      </div>
    );
  }

  const weights = entries.map((e) => e.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = entries.map((entry, i) => {
    const x = PADDING + (i / (entries.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((entry.weight_kg - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

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
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Weight trend chart">
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 3.5 : 2} fill="var(--accent)" />
        ))}
      </svg>
    </div>
  );
}
