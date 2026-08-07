"use client";

import { useRef, useState } from "react";
import type { PlanDay, PlanExercise, ExerciseCategory, LogType } from "@/lib/types";
import ExerciseCard from "./ExerciseCard";
import RunLogger from "./RunLogger";

function todayLocalISODate() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const CATEGORY_ORDER: ExerciseCategory[] = ["warmup", "main", "cooldown"];
const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  warmup: "Warm-up",
  main: "Main",
  cooldown: "Cool-down",
};
const DAY_TYPE_LABELS: Record<string, string> = {
  strength: "Strength",
  running: "Running",
  active_recovery: "Active Recovery",
  rest: "Rest",
};

export default function WorkoutDayClient({
  day,
  initialExercises,
}: {
  day: PlanDay;
  initialExercises: PlanExercise[];
}) {
  const [exercises, setExercises] = useState(initialExercises);
  const [editMode, setEditMode] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  async function ensureSessionId(): Promise<string> {
    if (sessionIdRef.current) return sessionIdRef.current;

    const cacheKey = `session:${day.id}:${todayLocalISODate()}`;
    const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      sessionIdRef.current = cached;
      return cached;
    }

    const res = await fetch("/api/workouts/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_day_id: day.id, session_date: todayLocalISODate() }),
    });
    if (!res.ok) throw new Error("Failed to create session");
    const { session } = await res.json();
    localStorage.setItem(cacheKey, session.id);
    sessionIdRef.current = session.id;
    return session.id;
  }

  function byCategory(cat: ExerciseCategory) {
    return exercises.filter((e) => e.category === cat).sort((a, b) => a.sort_order - b.sort_order);
  }

  async function handleMove(pe: PlanExercise, direction: "up" | "down") {
    const group = byCategory(pe.category);
    const idx = group.findIndex((g) => g.id === pe.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= group.length) return;
    const other = group[swapIdx];

    setExercises((prev) =>
      prev.map((e) => {
        if (e.id === pe.id) return { ...e, sort_order: other.sort_order };
        if (e.id === other.id) return { ...e, sort_order: pe.sort_order };
        return e;
      })
    );

    await Promise.all([
      fetch(`/api/workouts/plan-exercises/${pe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: other.sort_order }),
      }),
      fetch(`/api/workouts/plan-exercises/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: pe.sort_order }),
      }),
    ]);
  }

  async function handleDelete(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/workouts/plan-exercises/${id}`, { method: "DELETE" });
  }

  function handleUpdated(updated: PlanExercise) {
    setExercises((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function handleAdded(created: PlanExercise) {
    setExercises((prev) => [...prev, created]);
  }

  return (
    <main className="flex flex-col gap-5 px-4 pt-6">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            {DAY_TYPE_LABELS[day.day_type]}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{day.name}</h1>
        </div>
        <button onClick={() => setEditMode((v) => !v)} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
          {editMode ? "Done" : "Edit"}
        </button>
      </div>

      {day.description && (
        <div className="rounded-2xl bg-card p-4 text-sm shadow-sm" style={{ color: "var(--muted)" }}>
          {day.description}
        </div>
      )}

      {day.day_type === "rest" && exercises.length === 0 && (
        <div className="rounded-2xl bg-card p-4 text-sm shadow-sm" style={{ color: "var(--muted)" }}>
          Rest day — no logging needed.
        </div>
      )}

      {day.day_type === "running" && !editMode && (
        <RunLogger ensureSessionId={ensureSessionId} />
      )}

      {CATEGORY_ORDER.map((cat) => {
        const items = byCategory(cat);
        if (items.length === 0 && !editMode) return null;
        return (
          <section key={cat} className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {CATEGORY_LABELS[cat]}
            </h2>
            {items.map((pe, i) => (
              <ExerciseCard
                key={pe.id}
                planExercise={pe}
                editMode={editMode}
                isFirst={i === 0}
                isLast={i === items.length - 1}
                enableLogData
                enableViewProgress
                ensureSessionId={ensureSessionId}
                onMove={(dir) => handleMove(pe, dir)}
                onDelete={() => handleDelete(pe.id)}
                onUpdated={handleUpdated}
              />
            ))}
            {editMode && <AddExerciseForm dayId={day.id} category={cat} onAdded={handleAdded} />}
          </section>
        );
      })}
    </main>
  );
}

function AddExerciseForm({
  dayId,
  category,
  onAdded,
}: {
  dayId: string;
  category: ExerciseCategory;
  onAdded: (pe: PlanExercise) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logType, setLogType] = useState<LogType>(category === "main" ? "main_lift" : "reps");
  const [targetSets, setTargetSets] = useState("3");
  const [targetReps, setTargetReps] = useState("");
  const [targetDuration, setTargetDuration] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/workouts/plan-exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_day_id: dayId,
        new_exercise_name: name.trim(),
        category,
        log_type: logType,
        target_sets: logType === "main_lift" ? Number(targetSets) || null : null,
        target_reps: logType === "main_lift" || logType === "reps" ? targetReps || null : null,
        target_duration_seconds:
          logType === "duration" || logType === "hold_time" ? Number(targetDuration) || null : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { planExercise } = await res.json();
      onAdded(planExercise);
      setName("");
      setTargetReps("");
      setTargetDuration("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-dashed py-3 text-sm font-medium"
        style={{ borderColor: "var(--border)", color: "var(--accent)" }}
      >
        + Add exercise
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        autoFocus
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <select
        value={logType}
        onChange={(e) => setLogType(e.target.value as LogType)}
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      >
        <option value="main_lift">Sets × reps (with weight)</option>
        <option value="reps">Reps only</option>
        <option value="duration">Timed</option>
        <option value="hold_time">Hold time</option>
      </select>

      {logType === "main_lift" && (
        <div className="flex gap-2">
          <input
            type="number"
            value={targetSets}
            onChange={(e) => setTargetSets(e.target.value)}
            placeholder="Sets"
            className="w-20 rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
          />
          <input
            value={targetReps}
            onChange={(e) => setTargetReps(e.target.value)}
            placeholder="Target reps (e.g. 8-12)"
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      )}
      {logType === "reps" && (
        <input
          value={targetReps}
          onChange={(e) => setTargetReps(e.target.value)}
          placeholder="Target reps"
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      )}
      {(logType === "duration" || logType === "hold_time") && (
        <input
          type="number"
          value={targetDuration}
          onChange={(e) => setTargetDuration(e.target.value)}
          placeholder="Target seconds"
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      )}

      <div className="mt-1 flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-xl py-2 text-sm font-medium" style={{ color: "var(--accent)" }}>
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={saving || !name.trim()}
          className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
