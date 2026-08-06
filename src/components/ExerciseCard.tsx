"use client";

import { useState } from "react";
import type { PlanExercise } from "@/lib/types";
import VideoModal from "./VideoModal";

function formatTarget(pe: PlanExercise): string {
  if (pe.log_type === "main_lift") {
    const sets = pe.target_sets ? `${pe.target_sets} × ` : "";
    return `${sets}${pe.target_reps ?? "?"} reps`;
  }
  if (pe.notes) return pe.notes;
  if (pe.log_type === "reps") return `${pe.target_reps ?? "?"} reps`;
  if (pe.log_type === "duration") return `${pe.target_duration_seconds ?? "?"}s`;
  return `Hold ${pe.target_duration_seconds ?? "?"}s`;
}

const ACTION_BUTTON =
  "flex-1 rounded-xl py-2 text-center text-sm font-medium";

export default function ExerciseCard({
  planExercise,
  editMode,
  isFirst,
  isLast,
  enableLogData = false,
  enableViewProgress = false,
  onMove,
  onDelete,
  onUpdated,
}: {
  planExercise: PlanExercise;
  editMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  enableLogData?: boolean;
  enableViewProgress?: boolean;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  onUpdated: (updated: PlanExercise) => void;
}) {
  const [showVideo, setShowVideo] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const exercise = planExercise.exercises;

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <button
          onClick={() => (exercise.video_url ? setShowVideo(true) : editMode && setEditing(true))}
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl"
          style={{ backgroundColor: "color-mix(in srgb, var(--muted) 15%, transparent)" }}
        >
          {exercise.video_url ? (
            <svg viewBox="0 0 24 24" width={26} height={26} fill="var(--accent)">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--muted)" strokeWidth={1.6}>
              <path d="M15 10l5-3v10l-5-3M4 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <p className="text-base font-semibold">{exercise.name}</p>
          <p className="text-sm" style={{ color: "var(--accent)" }}>
            {formatTarget(planExercise)}
          </p>
          {exercise.instructions && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 text-xs font-medium"
              style={{ color: "var(--muted)" }}
            >
              {expanded ? "Less" : "More"}
            </button>
          )}
        </div>

        {editMode && (
          <div className="flex flex-col items-center gap-1">
            <button onClick={() => onMove("up")} disabled={isFirst} className="disabled:opacity-30">
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--muted)" strokeWidth={2}>
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>
            <button onClick={() => onMove("down")} disabled={isLast} className="disabled:opacity-30">
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--muted)" strokeWidth={2}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {expanded && exercise.instructions && (
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {exercise.instructions}
        </p>
      )}

      {editMode ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className={ACTION_BUTTON}
            style={{ backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className={ACTION_BUTTON}
            style={{ backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            disabled={!enableLogData}
            className={ACTION_BUTTON}
            style={{
              backgroundColor: "var(--accent)",
              color: "white",
              opacity: enableLogData ? 1 : 0.4,
            }}
          >
            Log Data
          </button>
          <button
            disabled={!enableViewProgress}
            className={ACTION_BUTTON}
            style={{
              backgroundColor: "color-mix(in srgb, var(--muted) 15%, transparent)",
              opacity: enableViewProgress ? 1 : 0.4,
            }}
          >
            View Progress
          </button>
          <button
            disabled
            title="Available once Google Drive sync is set up (Phase 3)"
            className={ACTION_BUTTON}
            style={{ backgroundColor: "color-mix(in srgb, var(--muted) 15%, transparent)", opacity: 0.4 }}
          >
            Record
          </button>
        </div>
      )}

      {editing && (
        <ExerciseEditForm
          planExercise={planExercise}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            onUpdated(updated);
            setEditing(false);
          }}
        />
      )}

      {showVideo && exercise.video_url && (
        <VideoModal videoUrl={exercise.video_url} title={exercise.name} onClose={() => setShowVideo(false)} />
      )}
    </div>
  );
}

function ExerciseEditForm({
  planExercise,
  onCancel,
  onSaved,
}: {
  planExercise: PlanExercise;
  onCancel: () => void;
  onSaved: (updated: PlanExercise) => void;
}) {
  const [videoUrl, setVideoUrl] = useState(planExercise.exercises.video_url ?? "");
  const [targetSets, setTargetSets] = useState(planExercise.target_sets?.toString() ?? "");
  const [targetReps, setTargetReps] = useState(planExercise.target_reps ?? "");
  const [targetDuration, setTargetDuration] = useState(
    planExercise.target_duration_seconds?.toString() ?? ""
  );
  const [notes, setNotes] = useState(planExercise.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);

    await fetch(`/api/workouts/exercises/${planExercise.exercise_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrl || null }),
    });

    const res = await fetch(`/api/workouts/plan-exercises/${planExercise.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_sets: targetSets ? Number(targetSets) : null,
        target_reps: targetReps || null,
        target_duration_seconds: targetDuration ? Number(targetDuration) : null,
        notes: notes || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      const { planExercise: updated } = await res.json();
      onSaved({ ...updated, exercises: { ...updated.exercises, video_url: videoUrl || null } });
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        Video link (YouTube or Google Drive)
      </label>
      <input
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="https://..."
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />

      {planExercise.log_type === "main_lift" && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Sets</label>
            <input
              type="number"
              value={targetSets}
              onChange={(e) => setTargetSets(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Target reps</label>
            <input
              value={targetReps}
              onChange={(e) => setTargetReps(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
        </div>
      )}

      {planExercise.log_type !== "main_lift" && (
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
            {planExercise.log_type === "reps" ? "Target reps" : "Target seconds"}
          </label>
          {planExercise.log_type === "reps" ? (
            <input
              value={targetReps}
              onChange={(e) => setTargetReps(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          ) : (
            <input
              type="number"
              value={targetDuration}
              onChange={(e) => setTargetDuration(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          )}
        </div>
      )}

      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        Notes (shown on the card)
      </label>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />

      <div className="mt-1 flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2 text-sm font-medium" style={{ color: "var(--accent)" }}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
