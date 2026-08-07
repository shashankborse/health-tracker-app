"use client";

import { useState } from "react";
import type { PlanExercise } from "@/lib/types";
import RepTally from "./RepTally";
import { postWithQueue } from "@/lib/offlineQueue";

function parseFirstNumber(text: string | null, fallback: number): number {
  if (!text) return fallback;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

type ConfirmedSet = { setNumber: number; reps: number; weight: string; rpe: string };

export default function LogDataPanel({
  planExercise,
  ensureSessionId,
  onDone,
}: {
  planExercise: PlanExercise;
  ensureSessionId: () => Promise<string>;
  onDone: () => void;
}) {
  if (planExercise.log_type === "main_lift") {
    return <MainLiftLogger planExercise={planExercise} ensureSessionId={ensureSessionId} onDone={onDone} />;
  }
  return <SingleEntryLogger planExercise={planExercise} ensureSessionId={ensureSessionId} onDone={onDone} />;
}

function MainLiftLogger({
  planExercise,
  ensureSessionId,
  onDone,
}: {
  planExercise: PlanExercise;
  ensureSessionId: () => Promise<string>;
  onDone: () => void;
}) {
  const totalSets = planExercise.target_sets ?? 3;
  const defaultReps = parseFirstNumber(planExercise.target_reps, 10);

  const [confirmed, setConfirmed] = useState<ConfirmedSet[]>([]);
  const [reps, setReps] = useState(defaultReps);
  const [weight, setWeight] = useState("");
  const [rpe, setRpe] = useState("7");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setNumber = confirmed.length + 1;
  const allDone = confirmed.length >= totalSets;

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    let sessionId: string;
    try {
      sessionId = await ensureSessionId();
    } catch {
      setSaving(false);
      setError("Couldn't start today's session — check your connection and try again.");
      return;
    }
    await postWithQueue("/api/workouts/logs", {
      session_id: sessionId,
      plan_exercise_id: planExercise.id,
      client_id: crypto.randomUUID(),
      set_number: setNumber,
      actual_reps: reps,
      weight_kg: weight ? Number(weight) : null,
      rpe: Number(rpe),
    });
    setSaving(false);
    setConfirmed((prev) => [...prev, { setNumber, reps, weight, rpe }]);
    setReps(defaultReps);
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      {confirmed.map((s) => (
        <div key={s.setNumber} className="flex items-center justify-between text-sm" style={{ color: "var(--muted)" }}>
          <span>Set {s.setNumber}</span>
          <span>
            {s.reps} reps{s.weight ? ` · ${s.weight} kg` : ""} · RPE {s.rpe} ✓
          </span>
        </div>
      ))}

      {allDone ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            All {totalSets} sets logged ✓
          </p>
          <button onClick={onDone} className="text-sm font-medium" style={{ color: "var(--accent)" }}>
            Done
          </button>
        </div>
      ) : (
        <>
          {error && (
            <p className="text-center text-sm font-medium" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <p className="text-center text-sm font-semibold" style={{ color: "var(--muted)" }}>
            Set {setNumber} of {totalSets}
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Weight (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-base outline-none"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>RPE</label>
              <select
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-base outline-none"
                style={{ borderColor: "var(--border)" }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <RepTally value={reps} onChange={setReps} label="Reps" />

          <button
            onClick={handleConfirm}
            disabled={saving}
            className="rounded-xl py-2.5 text-base font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {saving ? "Saving…" : "Confirm set"}
          </button>
        </>
      )}
    </div>
  );
}

function SingleEntryLogger({
  planExercise,
  ensureSessionId,
  onDone,
}: {
  planExercise: PlanExercise;
  ensureSessionId: () => Promise<string>;
  onDone: () => void;
}) {
  const isReps = planExercise.log_type === "reps";
  const defaultValue = isReps
    ? parseFirstNumber(planExercise.target_reps, 10)
    : parseFirstNumber(String(planExercise.target_duration_seconds ?? ""), 30);

  const [value, setValue] = useState(defaultValue);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    let sessionId: string;
    try {
      sessionId = await ensureSessionId();
    } catch {
      setSaving(false);
      setError("Couldn't start today's session — check your connection and try again.");
      return;
    }
    await postWithQueue("/api/workouts/logs", {
      session_id: sessionId,
      plan_exercise_id: planExercise.id,
      client_id: crypto.randomUUID(),
      set_number: 1,
      actual_reps: isReps ? value : null,
      duration_seconds: planExercise.log_type === "duration" ? value : null,
      hold_time_seconds: planExercise.log_type === "hold_time" ? value : null,
    });
    setSaving(false);
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="mt-3 flex flex-col items-center gap-2 border-t py-2" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Logged ✓</p>
        <button onClick={onDone} className="text-sm font-medium" style={{ color: "var(--accent)" }}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      {error && (
        <p className="text-center text-sm font-medium" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <RepTally value={value} onChange={setValue} label={isReps ? "Reps" : "Seconds"} />
      <button
        onClick={handleConfirm}
        disabled={saving}
        className="w-full rounded-xl py-2.5 text-base font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--accent)" }}
      >
        {saving ? "Saving…" : "Confirm"}
      </button>
    </div>
  );
}
