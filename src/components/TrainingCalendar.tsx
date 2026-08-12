"use client";

import { useMemo, useState } from "react";
import Card from "./Card";

type Intensity = "rest" | "low" | "mod" | "high" | "peak";

const INTENSITY_LABELS: Record<Intensity, string> = {
  rest: "Rest",
  low: "Low",
  mod: "Mod",
  high: "High",
  peak: "Peak",
};
const INTENSITY_COLORS: Record<Intensity, string> = {
  rest: "var(--muted)",
  low: "var(--recovery)",
  mod: "var(--accent)",
  high: "var(--fuel)",
  peak: "var(--danger)",
};
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(d: Date): Date {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default function TrainingCalendar({ dailyTonnageByDate }: { dailyTonnageByDate: Record<string, number> }) {
  const today = new Date();
  const todayISO = toISODate(today);
  const [expanded, setExpanded] = useState(false);
  const [viewedMonth, setViewedMonth] = useState(startOfMonth(today));

  // Percentiles computed once over ALL logged training days — a day's
  // intensity is relative to the user's own overall training history.
  const { p25, p50, p75 } = useMemo(() => {
    const values = Object.values(dailyTonnageByDate).filter((v) => v > 0).sort((a, b) => a - b);
    const percentile = (p: number) => (values.length ? values[Math.min(values.length - 1, Math.floor(p * values.length))] : 0);
    return { p25: percentile(0.25), p50: percentile(0.5), p75: percentile(0.75) };
  }, [dailyTonnageByDate]);

  function intensityFor(tonnageKg: number): Intensity {
    if (tonnageKg <= 0) return "rest";
    if (tonnageKg <= p25) return "low";
    if (tonnageKg <= p50) return "mod";
    if (tonnageKg <= p75) return "high";
    return "peak";
  }

  function Dot({ date }: { date: Date }) {
    const iso = toISODate(date);
    const isFuture = date > today;
    if (isFuture) return <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "transparent" }} />;
    const tonnageKg = dailyTonnageByDate[iso] ?? 0;
    const intensity = intensityFor(tonnageKg);
    return (
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: INTENSITY_COLORS[intensity] }}
        title={`${INTENSITY_LABELS[intensity]}${tonnageKg > 0 ? ` · ${Math.round(tonnageKg)}kg` : ""}`}
      />
    );
  }

  const legend = (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2" style={{ borderColor: "var(--border)" }}>
      {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((key) => (
        <span key={key} className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: INTENSITY_COLORS[key] }} />
          {INTENSITY_LABELS[key]}
        </span>
      ))}
    </div>
  );

  const header = (
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        Training Calendar
      </p>
      <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--surface-2)" }}>
        {(["Week", "Month"] as const).map((label) => {
          const isActive = expanded ? label === "Month" : label === "Week";
          return (
            <button
              key={label}
              onClick={() => {
                setExpanded(label === "Month");
                setViewedMonth(startOfMonth(today));
              }}
              className="rounded-md px-2.5 py-1 text-xs font-semibold active:opacity-70"
              style={{
                backgroundColor: isActive ? "var(--card)" : "transparent",
                color: isActive ? "var(--foreground)" : "var(--muted)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!expanded) {
    const monday = startOfWeek(today);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    return (
      <Card className="p-4">
        {header}
        <div className="mt-3 flex justify-between gap-1">
          {weekDates.map((date) => {
            const iso = toISODate(date);
            const isToday = iso === todayISO;
            return (
              <div key={iso} className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                  {WEEKDAY_LETTERS[(date.getDay() + 6) % 7]}
                </span>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                  style={{
                    backgroundColor: isToday ? "var(--accent)" : "transparent",
                    color: isToday ? "white" : "var(--foreground)",
                  }}
                >
                  {date.getDate()}
                </div>
                <Dot date={date} />
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first

  const cells: ({ day: number; date: Date } | null)[] = [
    ...Array.from({ length: leadingOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, date: new Date(year, month, i + 1) })),
  ];

  const monthLabel = viewedMonth.toLocaleDateString("en-IE", { month: "long", year: "numeric" });
  const canGoNext = !isSameMonth(viewedMonth, today);

  return (
    <Card className="p-4">
      {header}

      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{monthLabel}</p>
        <div className="flex items-center gap-3">
          <button onClick={() => setViewedMonth(new Date(year, month - 1, 1))} aria-label="Previous month" className="active:opacity-60">
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            onClick={() => canGoNext && setViewedMonth(new Date(year, month + 1, 1))}
            disabled={!canGoNext}
            aria-label="Next month"
            className="active:opacity-60 disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-2 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>{w}</span>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} />;
          const iso = toISODate(cell.date);
          const isToday = iso === todayISO;
          return (
            <div key={iso} className="flex flex-col items-center gap-1">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: isToday ? "var(--accent)" : "transparent",
                  color: isToday ? "white" : "var(--foreground)",
                }}
              >
                {cell.day}
              </div>
              <Dot date={cell.date} />
            </div>
          );
        })}
      </div>

      {legend}
    </Card>
  );
}
