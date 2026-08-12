"use client";

import { useEffect, useState } from "react";
import MiniLineChart from "./MiniLineChart";

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

type Recording = {
  id: string;
  recorded_date: string;
};

export default function ViewProgressModal({
  exerciseId,
  planExerciseId,
  exerciseName,
  onClose,
}: {
  exerciseId: string;
  planExerciseId: string;
  exerciseName: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<HistoryLog[] | null>(null);
  const [error, setError] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    fetch(`/api/workouts/exercises/${exerciseId}/history`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setLogs(data.logs))
      .catch(() => setError(true));
  }, [exerciseId]);

  useEffect(() => {
    fetch(`/api/workouts/plan-exercises/${planExerciseId}/recordings`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setRecordings(data.recordings ?? []))
      .catch(() => {});
  }, [planExerciseId]);

  const grouped = new Map<string, HistoryLog[]>();
  for (const log of logs ?? []) {
    const date = log.workout_sessions?.session_date ?? log.created_at.slice(0, 10);
    grouped.set(date, [...(grouped.get(date) ?? []), log]);
  }
  const dates = [...grouped.keys()].sort((a, b) => (a < b ? 1 : -1));

  // API returns newest-first; charts read left-to-right chronologically.
  const chronological = [...(logs ?? [])].reverse();
  const repsSeries = chronological.filter((l) => l.actual_reps !== null).map((l) => l.actual_reps as number);
  const weightSeries = chronological.filter((l) => l.weight_kg !== null).map((l) => l.weight_kg as number);
  const durationSeries = chronological
    .filter((l) => l.duration_seconds !== null || l.hold_time_seconds !== null)
    .map((l) => (l.duration_seconds ?? l.hold_time_seconds) as number);

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

        {!error && logs !== null && logs.length > 0 && (
          <div className="mb-4 flex flex-col gap-3">
            <MiniLineChart label="Reps" unit="reps" points={repsSeries} />
            <MiniLineChart label="Weight" unit="kg" points={weightSeries} color="var(--recovery)" />
            <MiniLineChart label="Duration" unit="s" points={durationSeries} color="var(--fuel)" />
          </div>
        )}

        {recordings.length > 0 && (
          <div className="mb-4 flex flex-col gap-3">
            <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              Recordings
            </p>
            {recordings.map((rec) => (
              <div key={rec.id} className="overflow-hidden rounded-xl bg-black">
                <video
                  src={`/api/workouts/recordings/${rec.id}/stream`}
                  controls
                  playsInline
                  className="aspect-[9/16] w-full object-cover"
                />
                <p className="px-2 py-1 text-xs text-white/70">{formatDate(rec.recorded_date)}</p>
              </div>
            ))}
          </div>
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
