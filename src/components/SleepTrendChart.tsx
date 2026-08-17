"use client";

import { useRef, useState } from "react";

const WIDTH = 320;
const PADDING_X = 20;
const PADDING_Y = 16;

export type SleepPoint = { date: string; minutes: number };

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

// Same banded-chart technique as ReadinessTrendChart, but the semantics
// are goal-met/missed rather than low/moderate/optimal — a single green
// zone from the goal up to the chart's own max, not three fixed bands.
export default function SleepTrendChart({
  points,
  goalMinutes,
  height = 220,
}: {
  points: SleepPoint[];
  goalMinutes: number | null;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const HEIGHT = height;
  const chartTop = PADDING_Y;
  const chartBottom = HEIGHT - PADDING_Y - 20;
  const chartHeight = chartBottom - chartTop;

  if (points.length < 2) return null;

  const maxVal = Math.max(...points.map((p) => p.minutes), goalMinutes ?? 0) * 1.15 || 60;

  function yFor(v: number) {
    return chartBottom - (Math.max(0, v) / maxVal) * chartHeight;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const firstTime = new Date(points[0].date).getTime();
  const lastTime = new Date(points[points.length - 1].date).getTime();
  const dayRange = Math.max((lastTime - firstTime) / dayMs, 1);

  const coords = points.map((p) => {
    const dayOffset = (new Date(p.date).getTime() - firstTime) / dayMs;
    const x = PADDING_X + (dayOffset / dayRange) * (WIDTH - PADDING_X * 2);
    return { x, y: yFor(p.minutes) };
  });

  const metColor = (minutes: number) => (goalMinutes != null && minutes >= goalMinutes ? "var(--recovery)" : "var(--muted)");

  function handlePointer(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - svgX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setSelectedIndex(nearest);
  }

  const selected = selectedIndex !== null ? points[selectedIndex] : null;
  const selectedCoord = selectedIndex !== null ? coords[selectedIndex] : null;

  const tickStep = points.length <= 8 ? 1 : Math.ceil(points.length / 6);
  const tickIndices = points.map((_, i) => i).filter((i) => i % tickStep === 0 || i === points.length - 1);

  const avg = points.reduce((sum, p) => sum + p.minutes, 0) / points.length;
  const metCount = goalMinutes != null ? points.filter((p) => p.minutes >= goalMinutes).length : null;

  return (
    <div>
      <p className="text-sm font-semibold">
        {formatMinutes(avg)} <span className="font-normal" style={{ color: "var(--muted)" }}>per day (avg)</span>
      </p>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {goalMinutes == null
          ? "Set a sleep goal in Goals & profile to track progress"
          : metCount === points.length
            ? "Sleep goal met every day"
            : `Sleep goal met on ${metCount} of ${points.length} days`}
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label="Sleep duration trend chart, tap a point to see its value"
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType !== "mouse") handlePointer(e.clientX);
        }}
        onPointerLeave={() => setSelectedIndex(null)}
        style={{ touchAction: "pan-y" }}
        className="mt-2"
      >
        {goalMinutes != null && (
          <>
            <rect x={PADDING_X} y={chartTop} width={WIDTH - PADDING_X * 2} height={yFor(goalMinutes) - chartTop} fill="color-mix(in srgb, var(--recovery) 12%, transparent)" />
            <line x1={PADDING_X} x2={WIDTH - PADDING_X} y1={yFor(goalMinutes)} y2={yFor(goalMinutes)} stroke="var(--recovery)" strokeWidth={1} strokeDasharray="2,3" opacity={0.6} />
            <text x={WIDTH - 2} y={yFor(goalMinutes) - 3} textAnchor="end" fontSize={9} fill="var(--muted)">
              {formatMinutes(goalMinutes)} goal
            </text>
          </>
        )}
        <text x={WIDTH - 2} y={chartBottom + 3} textAnchor="end" fontSize={9} fill="var(--muted)">0</text>

        {coords.slice(1).map((c, i) => (
          <line key={i} x1={coords[i].x} y1={coords[i].y} x2={c.x} y2={c.y} stroke={metColor(points[i + 1].minutes)} strokeWidth={2} strokeLinecap="round" />
        ))}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={selectedIndex === i ? 4 : 2.5} fill={metColor(points[i].minutes)} stroke="var(--card)" strokeWidth={selectedIndex === i ? 1.5 : 0} />
        ))}
        {selectedCoord && (
          <line x1={selectedCoord.x} x2={selectedCoord.x} y1={chartTop} y2={chartBottom} stroke="var(--foreground)" strokeWidth={1} strokeDasharray="3,3" opacity={0.3} />
        )}

        {tickIndices.map((i) => (
          <text key={i} x={coords[i].x} y={HEIGHT - 4} textAnchor="middle" fontSize={9} fill="var(--muted)">
            {points.length <= 8
              ? new Date(`${points[i].date}T00:00:00`).toLocaleDateString("en-IE", { weekday: "narrow" })
              : new Date(`${points[i].date}T00:00:00`).getDate()}
          </text>
        ))}
      </svg>

      <div className="mt-1 flex h-5 items-center justify-center">
        {selected && (
          <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
            {formatDate(selected.date)} · <span style={{ color: metColor(selected.minutes) }}>{formatMinutes(selected.minutes)}</span>
          </p>
        )}
      </div>

      {goalMinutes != null && (
        <div className="mt-2 flex justify-center gap-4">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--recovery)" }} />
            Goal met
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--muted)" }} />
            Goal missed
          </span>
        </div>
      )}
    </div>
  );
}
