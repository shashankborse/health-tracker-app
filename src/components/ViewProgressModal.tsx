"use client";

import { useEffect, useState } from "react";

type HistoryLog = {
  id: string;
  set_number: number;
  actual_reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  duration_seconds: number | null;
  hold_time_seconds: number | null;
  created_at: string;
  workout_sessions: { session_date: string } | null;
};

function formatLog(log: HistoryLog): string {
  const parts: string[] = [];
  if (log.actual_reps !== null) parts.push(`${log.actual_reps} reps`);
  if (log.weight_kg !== null) parts.push(`${log.weight_kg} kg`);
  if (log.rpe !== null) parts.push(`RPE ${log.rpe}`);
  if (log.duration_seconds !== null) parts.push(`${log.duration_seconds}s`);
  if (log.hold_time_seconds !== null) parts.push(`Hold ${log.hold_time_seconds}s`);
  return parts.join(" · ") || "Logged";
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function ViewProgressModal({
  exerciseId,
  exerciseName,
  onClose,
}: {
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<HistoryLog[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/workouts/exercises/${exerciseId}/history`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setLogs(data.logs))
      .catch(() => setError(true));
  }, [exerciseId]);

  const grouped = new Map<string, HistoryLog[]>();
  for (const log of logs ?? []) {
    const date = log.workout_sessions?.session_date ?? log.created_at.slice(0, 10);
    grouped.set(date, [...(grouped.get(date) ?? []), log]);
  }
  const dates = [...grouped.keys()].sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{exerciseName}</h2>
          <button onClick={onClose} className="px-2 text-2xl leading-none" style={{ color: "var(--muted)" }}>
            ×
          </button>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            Couldn't load history.
          </p>
        )}
        {!error && logs === null && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Loading…
          </p>
        )}
        {!error && logs !== null && logs.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No logged sets yet for this exercise.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {dates.map((date) => (
            <div key={date}>
              <p className="mb-1 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                {formatDate(date)}
              </p>
              <div className="flex flex-col gap-1">
                {grouped
                  .get(date)!
                  .sort((a, b) => a.set_number - b.set_number)
                  .map((log) => (
                    <p key={log.id} className="text-sm" style={{ color: "var(--muted)" }}>
                      {formatLog(log)}
                    </p>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
