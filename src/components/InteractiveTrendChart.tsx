"use client";

import { useRef, useState } from "react";

const WIDTH = 320;
const HEIGHT = 160;
const PADDING = 20;

export type TrendPoint = { date: string; value: number };

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
  });
}

export default function InteractiveTrendChart({
  points,
  unit,
  color = "var(--accent)",
}: {
  points: TrendPoint[];
  unit: string;
  color?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (points.length < 2) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const firstTime = new Date(points[0].date).getTime();
  const lastTime = new Date(points[points.length - 1].date).getTime();
  const dayRange = Math.max((lastTime - firstTime) / dayMs, 1);

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p) => {
    const dayOffset = (new Date(p.date).getTime() - firstTime) / dayMs;
    const x = PADDING + (dayOffset / dayRange) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((p.value - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y };
  });

  const path = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

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

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label="Trend chart, tap a point to see its value"
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType !== "mouse") handlePointer(e.clientX);
        }}
        onPointerLeave={() => setSelectedIndex(null)}
        style={{ touchAction: "pan-y" }}
      >
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={selectedIndex === i ? 4 : 1.5} fill={color} />
        ))}
        {selectedCoord && (
          <line
            x1={selectedCoord.x}
            x2={selectedCoord.x}
            y1={PADDING}
            y2={HEIGHT - PADDING}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.5}
          />
        )}
      </svg>
      <div className="mt-1 flex h-5 items-center justify-center">
        {selected && (
          <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
            {formatDate(selected.date)} · <span style={{ color: "var(--foreground)" }}>{selected.value} {unit}</span>
          </p>
        )}
      </div>
    </div>
  );
}
