"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanDay, PlanExercise } from "@/lib/types";
import { todayLocalISODate } from "@/lib/date";
import { postWithQueue, deleteLoggedSet } from "@/lib/offlineQueue";

function parseFirstNumber(text: string | null, fallback: number): number {
  if (!text) return fallback;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type ConfirmedSet = { clientId: string; weight: number; reps: number; isNewPr?: boolean };

type ExerciseState = {
  planExercise: PlanExercise;
  confirmed: ConfirmedSet[];
  pendingWeight: string;
  pendingReps: number;
};

type SessionLogRow = {
  client_id: string;
  plan_exercise_id: string;
  actual_reps: number | null;
  weight_kg: number | null;
};

export default function LiveSessionClient({ day, exercises }: { day: PlanDay; exercises: PlanExercise[] }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [states, setStates] = useState<ExerciseState[]>(() =>
    exercises.map((pe) => ({
      planExercise: pe,
      confirmed: [],
      pendingWeight: "",
      pendingReps: parseFirstNumber(pe.target_reps, 10),
    }))
  );

  // Elapsed timer since this screen was opened — not persisted across a
  // reload; a live-workout aid, not a record of true session start time.
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  // Get-or-create today's session (same cache-key convention as
  // WorkoutDayClient's ensureSessionId), then pre-populate from whatever's
  // already logged — including via the older per-exercise-card flow — so
  // this screen never re-logs sets that already exist.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const cacheKey = `session:${day.id}:${todayLocalISODate()}`;
      let id = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      if (!id) {
        const res = await fetch("/api/workouts/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_day_id: day.id, session_date: todayLocalISODate() }),
        });
        if (!res.ok || cancelled) return;
        const { session } = (await res.json()) as { session: { id: string } };
        id = session.id;
        localStorage.setItem(cacheKey, session.id);
      }
      if (cancelled || !id) return;
      setSessionId(id);

      const logsRes = await fetch(`/api/workouts/sessions/${id}/logs`);
      if (!logsRes.ok) {
        setLoaded(true);
        return;
      }
      const { logs } = (await logsRes.json()) as { logs: SessionLogRow[] };
      if (cancelled) return;

      setStates((prev) =>
        prev.map((s) => {
          const existing = logs
            .filter((l) => l.plan_exercise_id === s.planExercise.id && l.weight_kg != null && l.actual_reps != null)
            .map((l) => ({ clientId: l.client_id, weight: Number(l.weight_kg), reps: Number(l.actual_reps) }));
          if (existing.length === 0) return s;
          return { ...s, confirmed: existing, pendingWeight: String(existing[existing.length - 1].weight) };
        })
      );
      setLoaded(true);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [day.id]);

  function updatePending(exerciseIndex: number, patch: Partial<Pick<ExerciseState, "pendingWeight" | "pendingReps">>) {
    setStates((prev) => prev.map((s, i) => (i !== exerciseIndex ? s : { ...s, ...patch })));
  }

  async function handleConfirm(exerciseIndex: number) {
    if (!sessionId) return;
    const state = states[exerciseIndex];
    const weightNum = state.pendingWeight ? Number(state.pendingWeight) : null;
    const clientId = crypto.randomUUID();
    const setNumber = state.confirmed.length + 1;

    const result = (await postWithQueue("/api/workouts/logs", {
      session_id: sessionId,
      plan_exercise_id: state.planExercise.id,
      client_id: clientId,
      set_number: setNumber,
      actual_reps: state.pendingReps,
      weight_kg: weightNum,
      rpe: null,
    })) as { isNewPr?: boolean } | null;

    setStates((prev) =>
      prev.map((s, i) =>
        i !== exerciseIndex
          ? s
          : {
              ...s,
              confirmed: [...s.confirmed, { clientId, weight: weightNum ?? 0, reps: state.pendingReps, isNewPr: result?.isNewPr }],
            }
      )
    );
  }

  async function handleRemove(exerciseIndex: number, clientId: string) {
    setStates((prev) =>
      prev.map((s, i) => (i !== exerciseIndex ? s : { ...s, confirmed: s.confirmed.filter((c) => c.clientId !== clientId) }))
    );
    await deleteLoggedSet("/api/workouts/logs", clientId);
  }

  const totalTargetSets = states.reduce((sum, s) => sum + (s.planExercise.target_sets ?? 3), 0);
  const totalConfirmedSets = states.reduce((sum, s) => sum + s.confirmed.length, 0);
  const totalVolume = states.reduce(
    (sum, s) => sum + s.confirmed.reduce((setSum, c) => setSum + c.weight * c.reps, 0),
    0
  );

  return (
    <main className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            Live session
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{day.name}</h1>
        </div>
        <button
          onClick={() => router.push(`/workouts/${day.id}`)}
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: "color-mix(in srgb, var(--danger) 15%, transparent)", color: "var(--danger)" }}
        >
          End
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-card p-3 text-center shadow-sm">
          <p className="text-xl font-bold tabular-nums">{formatElapsed(elapsed)}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Elapsed</p>
        </div>
        <div className="rounded-2xl bg-card p-3 text-center shadow-sm">
          <p className="text-xl font-bold tabular-nums">{totalConfirmedSets}/{totalTargetSets}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Sets</p>
        </div>
        <div className="rounded-2xl bg-card p-3 text-center shadow-sm">
          <p className="text-xl font-bold tabular-nums">{Math.round(totalVolume).toLocaleString()}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Volume (kg)</p>
        </div>
      </div>

      {!loaded ? (
        <p className="px-1 text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
      ) : states.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-sm shadow-sm" style={{ color: "var(--muted)" }}>
          No weighted exercises on this day.
        </p>
      ) : (
        states.map((s, i) => {
          const totalSets = s.planExercise.target_sets ?? 3;
          return (
            <div key={s.planExercise.id} className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="text-base font-semibold">{s.planExercise.exercises.name}</p>
              <p className="text-sm" style={{ color: "var(--accent)" }}>
                Target {totalSets} × {s.planExercise.target_reps ?? "?"}
              </p>

              <div className="mt-3 flex flex-col gap-2">
                {s.confirmed.map((c, setIdx) => (
                  <div key={c.clientId} className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--muted)" }}>Set {setIdx + 1}</span>
                    <span className="flex items-center gap-2">
                      {c.isNewPr && (
                        <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                          🏆 New PR!
                        </span>
                      )}
                      <span className="font-medium">{c.weight}kg × {c.reps}</span>
                      <span style={{ color: "var(--accent)" }}>✓</span>
                      <button onClick={() => handleRemove(i, c.clientId)} style={{ color: "var(--danger)" }} aria-label={`Remove set ${setIdx + 1}`}>
                        ×
                      </button>
                    </span>
                  </div>
                ))}

                {s.confirmed.length < totalSets && (
                  <div className="flex items-center gap-3 rounded-xl p-2" style={{ backgroundColor: "color-mix(in srgb, var(--muted) 8%, transparent)" }}>
                    <span className="text-sm" style={{ color: "var(--muted)" }}>Set {s.confirmed.length + 1}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={s.pendingWeight}
                        onChange={(e) => updatePending(i, { pendingWeight: e.target.value })}
                        placeholder="kg"
                        className="w-16 rounded-lg border px-2 py-1.5 text-sm outline-none"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updatePending(i, { pendingReps: Math.max(0, s.pendingReps - 1) })}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-base font-semibold"
                          style={{ backgroundColor: "color-mix(in srgb, var(--muted) 15%, transparent)" }}
                          aria-label="Remove a rep"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{s.pendingReps}</span>
                        <button
                          onClick={() => updatePending(i, { pendingReps: s.pendingReps + 1 })}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-base font-semibold text-white"
                          style={{ backgroundColor: "var(--accent)" }}
                          aria-label="Add a rep"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirm(i)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: "var(--accent)" }}
                      aria-label={`Confirm set ${s.confirmed.length + 1} for ${s.planExercise.exercises.name}`}
                    >
                      ✓
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      <button
        onClick={() => router.push(`/workouts/${day.id}`)}
        className="mt-2 rounded-2xl py-3.5 text-base font-semibold text-white shadow-sm active:opacity-80"
        style={{ backgroundColor: "var(--accent)" }}
      >
        Finish session
      </button>
    </main>
  );
}
