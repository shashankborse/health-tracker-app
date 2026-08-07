"use client";

import Link from "next/link";
import type { PlanDay, DayType } from "@/lib/types";

const DAY_TYPE_COLORS: Record<DayType, string> = {
  strength: "var(--accent)",
  running: "#34c759",
  active_recovery: "#ff9500",
  rest: "var(--muted)",
};
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]; // index = JS day_of_week (0=Sun)

function startOfWeek(today: Date): Date {
  const monday = new Date(today);
  const diffFromMonday = (today.getDay() + 6) % 7; // 0 if today is Monday
  monday.setDate(today.getDate() - diffFromMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function WeekStrip({ days }: { days: PlanDay[] }) {
  const today = new Date();
  const monday = startOfWeek(today);
  const byDayOfWeek = new Map(days.map((d) => [d.day_of_week, d]));

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });

  return (
    <div className="flex justify-between gap-1 rounded-2xl bg-card p-3 shadow-sm">
      {weekDates.map((date) => {
        const dayOfWeek = date.getDay();
        const planDay = byDayOfWeek.get(dayOfWeek);
        const isToday = date.toDateString() === today.toDateString();

        const cell = (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
              {WEEKDAY_LETTERS[dayOfWeek]}
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
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: planDay ? DAY_TYPE_COLORS[planDay.day_type] : "transparent" }}
            />
          </div>
        );

        return planDay ? (
          <Link key={dayOfWeek} href={`/workouts/${planDay.id}`} className="active:opacity-60">
            {cell}
          </Link>
        ) : (
          <div key={dayOfWeek}>{cell}</div>
        );
      })}
    </div>
  );
}
