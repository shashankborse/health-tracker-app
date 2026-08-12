"use client";

import { useState } from "react";
import InteractiveTrendChart from "./InteractiveTrendChart";
import ReadinessCard from "./ReadinessCard";
import Card from "./Card";
import type { ReadinessResult } from "@/lib/readiness";

type View = "day" | "week" | "month";
const VIEWS: View[] = ["day", "week", "month"];

function toPoints(series: ReadinessResult[]) {
  return series.filter((r) => r.score != null).map((r) => ({ date: r.date, value: r.score as number }));
}

export default function ReadinessDetailClient({ series }: { series: ReadinessResult[] }) {
  const [view, setView] = useState<View>("day");
  const today = series[series.length - 1];
  const weekPoints = toPoints(series.slice(-7));
  const monthPoints = toPoints(series);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: "var(--surface-2)" }}>
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="flex-1 rounded-lg py-1.5 text-sm font-semibold capitalize active:opacity-70"
            style={{
              backgroundColor: view === v ? "var(--card)" : "transparent",
              color: view === v ? "var(--foreground)" : "var(--muted)",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "day" ? (
        <ReadinessCard readiness={today} />
      ) : (
        <Card className="p-4">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            {view === "week" ? "Last 7 days" : "Last 30 days"}
          </p>
          {(view === "week" ? weekPoints : monthPoints).length >= 2 ? (
            <InteractiveTrendChart points={view === "week" ? weekPoints : monthPoints} unit="" color="var(--accent)" height={180} />
          ) : (
            <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              Not enough data yet.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
