"use client";

import { useState } from "react";
import Link from "next/link";
import SleepTrendChart, { type SleepPoint } from "./SleepTrendChart";
import Card from "./Card";

type View = "day" | "week" | "month";
const VIEWS: View[] = ["day", "week", "month"];

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function SleepDetailClient({
  points,
  goalMinutes,
  lastNight,
}: {
  points: SleepPoint[];
  goalMinutes: number | null;
  lastNight: { id: string; minutes: number; endTime: string } | null;
}) {
  const [view, setView] = useState<View>("day");
  const weekPoints = points.slice(-7);

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
        lastNight ? (
          <Link href={`/health/sleep/${lastNight.id}`} className="active:opacity-70">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                  Last night
                </p>
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </div>
              <p className="mt-1 text-3xl font-bold tabular-nums">{formatMinutes(lastNight.minutes)}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {new Date(lastNight.endTime).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </Card>
          </Link>
        ) : (
          <Card className="p-4">
            <p className="text-sm" style={{ color: "var(--muted)" }}>No sleep data synced yet.</p>
          </Card>
        )
      ) : (
        <Card className="p-4">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            {view === "week" ? "Last 7 days" : "Last 30 days"}
          </p>
          {(view === "week" ? weekPoints : points).length >= 2 ? (
            <SleepTrendChart points={view === "week" ? weekPoints : points} goalMinutes={goalMinutes} height={220} />
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
