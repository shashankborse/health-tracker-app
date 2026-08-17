"use client";

import { useRef, useState } from "react";
import { bandFor, type ReadinessBand } from "@/lib/readiness";
import { BAND_COLORS, BAND_LABELS } from "./ReadinessCard";

const WIDTH = 320;
const PADDING_X = 20;
const PADDING_Y = 16;
const LOW_HIGH = 34; // matches bandFor's own thresholds — not Google's 29/64
const HIGH_LOW = 66;

export type TrendPoint = { date: string; value: number };

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

// Modeled on Google Health's own "Daily readiness" trend view: banded
// high/moderate/low background zones with y-axis labels at the real
// thresholds, plus per-point/segment coloring by band — rather than a
// single flat line, since the whole point of a readiness score is which
// zone it lands in, not just its raw trend direction.
export default function ReadinessTrendChart({ points, height = 220 }: { points: TrendPoint[]; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const HEIGHT = height;
  const chartTop = PADDING_Y;
  const chartBottom = HEIGHT - PADDING_Y - 20; // leave room for x-axis labels
  const chartHeight = chartBottom - chartTop;

  if (points.length < 2) return null;

  function yFor(value: number) {
    return chartBottom - (Math.max(0, Math.min(100, value)) / 100) * chartHeight;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const firstTime = new Date(points[0].date).getTime();
  const lastTime = new Date(points[points.length - 1].date).getTime();
  const dayRange = Math.max((lastTime - firstTime) / dayMs, 1);

  const coords = points.map((p) => {
    const dayOffset = (new Date(p.date).getTime() - firstTime) / dayMs;
    const x = PADDING_X + (dayOffset / dayRange) * (WIDTH - PADDING_X * 2);
    return { x, y: yFor(p.value) };
  });

  const bands = points.map((p) => bandFor(p.value));
  const dominant: ReadinessBand | "mixed" = bands.every((b) => b === bands[0]) ? bands[0] : "mixed";

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

  // Sparse x-axis ticks — every point for a week, ~6 evenly spaced for a
  // month (labeling all 30 would collide).
  const tickStep = points.length <= 8 ? 1 : Math.ceil(points.length / 6);
  const tickIndices = points.map((_, i) => i).filter((i) => i % tickStep === 0 || i === points.length - 1);

  return (
    <div>
      <p className="text-sm font-semibold">
        {dominant === "mixed" ? "Mixed" : `Mostly ${BAND_LABELS[dominant]}`}
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label="Readiness trend chart with high/moderate/low bands, tap a point to see its value"
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType !== "mouse") handlePointer(e.clientX);
        }}
        onPointerLeave={() => setSelectedIndex(null)}
        style={{ touchAction: "pan-y" }}
        className="mt-2"
      >
        {/* Banded background zones, tinted with the same tokens as BAND_COLORS */}
        <rect x={PADDING_X} y={chartTop} width={WIDTH - PADDING_X * 2} height={yFor(HIGH_LOW) - chartTop} fill="color-mix(in srgb, var(--recovery) 12%, transparent)" />
        <rect x={PADDING_X} y={yFor(HIGH_LOW)} width={WIDTH - PADDING_X * 2} height={yFor(LOW_HIGH) - yFor(HIGH_LOW)} fill="color-mix(in srgb, var(--muted) 10%, transparent)" />
        <rect x={PADDING_X} y={yFor(LOW_HIGH)} width={WIDTH - PADDING_X * 2} height={chartBottom - yFor(LOW_HIGH)} fill="color-mix(in srgb, var(--destructive) 10%, transparent)" />

        {/* Threshold separators */}
        {[LOW_HIGH, HIGH_LOW].map((t) => (
          <line key={t} x1={PADDING_X} x2={WIDTH - PADDING_X} y1={yFor(t)} y2={yFor(t)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="2,3" opacity={0.5} />
        ))}

        {/* Y-axis labels */}
        {[0, LOW_HIGH, HIGH_LOW, 100].map((t) => (
          <text key={t} x={WIDTH - 2} y={yFor(t) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">
            {t}
          </text>
        ))}

        {/* Line segments, colored by the ending point's band */}
        {coords.slice(1).map((c, i) => (
          <line key={i} x1={coords[i].x} y1={coords[i].y} x2={c.x} y2={c.y} stroke={BAND_COLORS[bands[i + 1]]} strokeWidth={2} strokeLinecap="round" />
        ))}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={selectedIndex === i ? 4 : 2.5} fill={BAND_COLORS[bands[i]]} stroke="var(--card)" strokeWidth={selectedIndex === i ? 1.5 : 0} />
        ))}
        {selectedCoord && (
          <line x1={selectedCoord.x} x2={selectedCoord.x} y1={chartTop} y2={chartBottom} stroke="var(--foreground)" strokeWidth={1} strokeDasharray="3,3" opacity={0.3} />
        )}

        {/* X-axis labels */}
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
            {formatDate(selected.date)} · <span style={{ color: BAND_COLORS[bandFor(selected.value)] }}>{selected.value} · {BAND_LABELS[bandFor(selected.value)]}</span>
          </p>
        )}
      </div>

      <div className="mt-2 flex justify-center gap-4">
        {(["low", "moderate", "optimal"] as ReadinessBand[]).map((b) => (
          <span key={b} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BAND_COLORS[b] }} />
            {BAND_LABELS[b]}
          </span>
        ))}
      </div>
    </div>
  );
}
