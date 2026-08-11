"use client";

import { useState } from "react";
import type { PlanExercise } from "@/lib/types";
import RepTally from "./RepTally";
import { postWithQueue, deleteLoggedSet } from "@/lib/offlineQueue";

function parseFirstNumber(text: string | null, fallback: number): number {
  if (!text) return fallback;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

type ConfirmedSet = {
  clientId: string;
  setNumber: number;
  reps: number;
  weight: string;
  rpe: string;
  isNewPr?: boolean;
  overloadSuggestion?: { decision: string; nextWeightKg: number } | null;
};

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
  const [formOpen, setFormOpen] = useState(true);

  const setNumber = confirmed.length + 1;
  const targetReached = confirmed.length >= totalSets;

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
    const clientId = crypto.randomUUID();
    const result = (await postWithQueue("/api/workouts/logs", {
      session_id: sessionId,
      plan_exercise_id: planExercise.id,
      client_id: clientId,
      set_number: setNumber,
      actual_reps: reps,
      weight_kg: weight ? Number(weight) : null,
      rpe: Number(rpe),
    })) as { isNewPr?: boolean; overloadSuggestion?: { decision: string; nextWeightKg: number } | null } | null;
    setSaving(false);
    setConfirmed((prev) => [
      ...prev,
      { clientId, setNumber, reps, weight, rpe, isNewPr: result?.isNewPr, overloadSuggestion: result?.overloadSuggestion },
    ]);
    setReps(defaultReps);
    if (confirmed.length + 1 >= totalSets) setFormOpen(false);
  }

  async function handleRemove(clientId: string) {
    setConfirmed((prev) => prev.filter((s) => s.clientId !== clientId));
    await deleteLoggedSet("/api/workouts/logs", clientId);
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      {confirmed.map((s) => (
        <div key={s.clientId} className="flex items-center justify-between text-sm" style={{ color: "var(--muted)" }}>
          <span>Set {s.setNumber}</span>
          <span className="flex items-center gap-2">
            {s.isNewPr && (
              <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                🏆 New PR!
              </span>
            )}
            {s.overloadSuggestion?.decision === "increase" && (
              <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                📈 Next: {s.overloadSuggestion.nextWeightKg}kg
              </span>
            )}
            {s.reps} reps{s.weight ? ` · ${s.weight} kg` : ""} · RPE {s.rpe} ✓
            <button onClick={() => handleRemove(s.clientId)} style={{ color: "var(--danger)" }} aria-label={`Remove set ${s.setNumber}`}>
              ×
            </button>
          </span>
        </div>
      ))}

      {!formOpen ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            {targetReached ? `All ${totalSets} sets logged ✓` : `${confirmed.length} sets logged`}
          </p>
          <div className="flex gap-4">
            <button onClick={() => setFormOpen(true)} className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              + Add another set
            </button>
            <button onClick={onDone} className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Done
            </button>
          </div>
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

          <div className="flex gap-2">
            {targetReached && (
              <button
                onClick={() => setFormOpen(false)}
                className="flex-1 rounded-xl py-2.5 text-base font-medium"
                style={{ color: "var(--accent)" }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-base font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {saving ? "Saving…" : "Confirm set"}
            </button>
          </div>
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
