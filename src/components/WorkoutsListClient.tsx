"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlanDay, DayType } from "@/lib/types";
import WeekStrip from "./WeekStrip";

const DAY_TYPE_LABELS: Record<DayType, string> = {
  strength: "Strength",
  running: "Running",
  active_recovery: "Active Recovery",
  rest: "Rest",
};
const DAY_TYPE_COLORS: Record<DayType, string> = {
  strength: "var(--accent)",
  running: "#34c759",
  active_recovery: "#ff9500",
  rest: "var(--muted)",
};

export default function WorkoutsListClient({
  initialDays,
  exerciseCounts,
}: {
  initialDays: PlanDay[];
  exerciseCounts: Record<string, number>;
}) {
  const [days, setDays] = useState(initialDays);
  const [editMode, setEditMode] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  // Pull-to-refresh calls router.refresh(), which reruns the Server
  // Component and passes a new initialDays — sync it in, since useState's
  // initial value is otherwise only read once.
  useEffect(() => {
    setDays(initialDays);
  }, [initialDays]);

  const sorted = [...days].sort((a, b) => a.sort_order - b.sort_order);
  const todayDayOfWeek = new Date().getDay();

  async function handleMove(day: PlanDay, direction: "up" | "down") {
    const idx = sorted.findIndex((d) => d.id === day.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];

    setDays((prev) =>
      prev.map((d) => {
        if (d.id === day.id) return { ...d, sort_order: other.sort_order };
        if (d.id === other.id) return { ...d, sort_order: day.sort_order };
        return d;
      })
    );

    await Promise.all([
      fetch(`/api/workouts/plan-days/${day.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: other.sort_order }),
      }),
      fetch(`/api/workouts/plan-days/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: day.sort_order }),
      }),
    ]);
  }

  async function handleRename(day: PlanDay, name: string) {
    if (!name.trim() || name === day.name) return;
    setDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, name } : d)));
    await fetch(`/api/workouts/plan-days/${day.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function handleDelete(day: PlanDay) {
    if (!window.confirm(`Delete "${day.name}"? This removes all its exercises too.`)) return;
    setDays((prev) => prev.filter((d) => d.id !== day.id));
    await fetch(`/api/workouts/plan-days/${day.id}`, { method: "DELETE" });
  }

  async function handleAddDay() {
    if (!newName.trim()) return;
    const res = await fetch("/api/workouts/plan-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), day_type: "strength" }),
    });
    if (res.ok) {
      const { day } = await res.json();
      setDays((prev) => [...prev, day]);
      setNewName("");
      setAdding(false);
    }
  }

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-3xl font-bold tracking-tight">Workouts</h1>
        <button onClick={() => setEditMode((v) => !v)} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
          {editMode ? "Done" : "Edit"}
        </button>
      </div>

      <WeekStrip days={days} />

      <div className="flex flex-col gap-3">
        {sorted.map((day, i) => {
          const count = exerciseCounts[day.id] ?? 0;
          const isToday = day.day_of_week === todayDayOfWeek;
          const card = (
            <div
              className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm"
              style={isToday ? { boxShadow: "0 0 0 1.5px var(--accent)" } : undefined}
            >
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: DAY_TYPE_COLORS[day.day_type] }}
              />
              <div className="flex-1">
                {editMode ? (
                  <input
                    defaultValue={day.name}
                    onBlur={(e) => handleRename(day, e.target.value)}
                    className="w-full rounded-lg border px-2 py-1 text-base font-semibold outline-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                ) : (
                  <p className="text-base font-semibold">
                    {day.name}
                    {isToday && (
                      <span className="ml-2 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                        TODAY
                      </span>
                    )}
                  </p>
                )}
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {DAY_TYPE_LABELS[day.day_type]}
                  {count > 0
                    ? ` · ${count} exercises`
                    : day.day_type === "rest" || day.day_type === "active_recovery"
                      ? " · no logging"
                      : ""}
                </p>
              </div>
              {editMode ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleMove(day, "up")} disabled={i === 0} className="disabled:opacity-30">
                      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="var(--muted)" strokeWidth={2}>
                        <path d="M6 15l6-6 6 6" />
                      </svg>
                    </button>
                    <button onClick={() => handleMove(day, "down")} disabled={i === sorted.length - 1} className="disabled:opacity-30">
                      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="var(--muted)" strokeWidth={2}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  <button onClick={() => handleDelete(day)}>
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--danger)" strokeWidth={1.8}>
                      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
                    </svg>
                  </button>
                </div>
              ) : (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--muted)" strokeWidth={2}>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              )}
            </div>
          );

          return editMode ? (
            <div key={day.id}>{card}</div>
          ) : (
            <Link key={day.id} href={`/workouts/${day.id}`} className="active:opacity-70">
              {card}
            </Link>
          );
        })}
      </div>

      {editMode &&
        (adding ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Day name"
              autoFocus
              className="rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 rounded-xl py-2 text-sm font-medium" style={{ color: "var(--accent)" }}>
                Cancel
              </button>
              <button
                onClick={handleAddDay}
                className="flex-1 rounded-xl py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--accent)" }}
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-2xl border border-dashed py-3 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--accent)" }}
          >
            + Add day
          </button>
        ))}
    </main>
  );
}
