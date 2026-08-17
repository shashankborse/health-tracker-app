"use client";

import Link from "next/link";
import type { DayType, PlanDay } from "@/lib/types";
import Card from "./Card";

const DAY_TYPE_LABELS: Record<DayType, string> = {
  strength: "Strength",
  running: "Running",
  active_recovery: "Active Recovery",
  rest: "Rest",
};

export type MainExerciseRow = {
  target_sets: number | null;
  target_reps: string | null;
  target_weight_kg: number | null;
  exercises: { name: string } | null;
};

export default function TodaysSessionCard({
  days,
  mainExercisesByDay,
}: {
  days: PlanDay[];
  mainExercisesByDay: Record<string, MainExerciseRow[]>;
}) {
  // Client-side match, same convention as WorkoutsListClient.tsx's own
  // "is this plan day today" logic — day_of_week has no server-rendered
  // equivalent in this schema.
  const todayDayOfWeek = new Date().getDay();
  const today = days.find((d) => d.day_of_week === todayDayOfWeek);

  if (!today) return null;

  const exercises = mainExercisesByDay[today.id] ?? [];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Today&apos;s session
        </p>
        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          {DAY_TYPE_LABELS[today.day_type]}
        </span>
      </div>
      <p className="mt-1 text-xl font-bold">{today.name}</p>

      {exercises.length === 0 ? (
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {today.day_type === "rest" ? "Rest day — no session scheduled." : "Nothing scheduled for today's plan yet."}
        </p>
      ) : (
        <div className="mt-3 flex flex-col">
          {exercises.map((ex, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 text-sm"
              style={i < exercises.length - 1 ? { borderBottom: "1px solid var(--border)" } : undefined}
            >
              <span className="font-medium">{ex.exercises?.name}</span>
              <span className="tabular-nums" style={{ color: "var(--muted)" }}>
                {ex.target_sets ?? "—"}×{ex.target_reps ?? "—"}
                {ex.target_weight_kg ? ` · ${ex.target_weight_kg}kg` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {exercises.length > 0 && (
        <Link
          href={`/workouts/${today.id}`}
          className="mt-3 block rounded-[14px] py-3 text-center text-sm font-semibold text-white active:scale-[0.97]"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Start workout
        </Link>
      )}
    </Card>
  );
}
