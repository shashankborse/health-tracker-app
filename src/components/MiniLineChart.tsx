import Card from "./Card";

const WIDTH = 320;
const HEIGHT = 100;
const PADDING = 16;

export default function MiniLineChart({
  label,
  unit,
  points,
  color = "var(--accent)",
}: {
  label: string;
  unit: string;
  points: number[];
  color?: string;
}) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((v, i) => {
    const x = PADDING + (i / (points.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((v - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y };
  });

  const path = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <Card className="p-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {points[points.length - 1]} {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label={`${label} trend`}>
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === coords.length - 1 ? 3 : 1.5} fill={color} />
        ))}
      </svg>
    </Card>
  );
}
