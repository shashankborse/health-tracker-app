const WIDTH = 320;
const HEIGHT = 200;
const PADDING = 32;

export type SleepReadinessPoint = { date: string; sleepMinutes: number; readinessScore: number };

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

// Static, hand-rolled scatter — no "use client" needed since there's no
// interactive state, just a hover <title> per point. Deliberately not an
// InteractiveTrendChart reuse: that component assumes an evenly-spaced
// time-series x-axis, not two independent numeric axes.
export default function SleepReadinessScatter({ points }: { points: SleepReadinessPoint[] }) {
  if (points.length < 3) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
        Not enough data yet — need a few more nights of sleep + next-day readiness.
      </p>
    );
  }

  const sleepValues = points.map((p) => p.sleepMinutes);
  const minSleep = Math.min(...sleepValues);
  const maxSleep = Math.max(...sleepValues);
  const sleepRange = maxSleep - minSleep || 1;
  const minScore = 0;
  const maxScore = 100;

  const coords = points.map((p) => ({
    x: PADDING + ((p.sleepMinutes - minSleep) / sleepRange) * (WIDTH - PADDING * 2),
    y: HEIGHT - PADDING - ((p.readinessScore - minScore) / (maxScore - minScore)) * (HEIGHT - PADDING * 2),
    point: p,
  }));

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Scatter plot of sleep duration versus next-day readiness score">
        <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke="var(--border)" strokeWidth={1} />
        <line x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT - PADDING} stroke="var(--border)" strokeWidth={1} />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={3.5} fill="var(--accent)" fillOpacity={0.7}>
            <title>{`${formatHours(c.point.sleepMinutes)} sleep → ${c.point.readinessScore} readiness next day`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs" style={{ color: "var(--muted)" }}>
        <span>{formatHours(minSleep)}</span>
        <span>Sleep duration →</span>
        <span>{formatHours(maxSleep)}</span>
      </div>
    </div>
  );
}
