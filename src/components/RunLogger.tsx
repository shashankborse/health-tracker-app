"use client";

import { useState } from "react";
import { postWithQueue } from "@/lib/offlineQueue";

export default function RunLogger({
  ensureSessionId,
}: {
  ensureSessionId: () => Promise<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState("");
  const [minutes, setMinutes] = useState("");
  const [rpe, setRpe] = useState("7");

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
    await postWithQueue("/api/workouts/run-logs", {
      session_id: sessionId,
      client_id: crypto.randomUUID(),
      distance_km: distance ? Number(distance) : null,
      duration_seconds: minutes ? Math.round(Number(minutes) * 60) : null,
      rpe: Number(rpe),
    });
    setSaving(false);
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="rounded-2xl bg-card p-4 text-center shadow-sm">
        <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
          Run logged ✓
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="rounded-2xl py-3.5 text-base font-semibold text-white shadow-sm active:opacity-80"
        style={{ backgroundColor: "var(--accent)" }}
      >
        + Log run
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm">
      {error && (
        <p className="text-center text-sm font-medium" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Distance (km)</label>
          <input
            type="number"
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-base outline-none"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Duration (min)</label>
          <input
            type="number"
            inputMode="decimal"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-base outline-none"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>RPE</label>
        <select
          value={rpe}
          onChange={(e) => setRpe(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setExpanded(false)} className="flex-1 rounded-xl py-2.5 text-base font-medium" style={{ color: "var(--accent)" }}>
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="flex-1 rounded-xl py-2.5 text-base font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
