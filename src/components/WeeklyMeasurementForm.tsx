"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { todayLocalISODate } from "@/lib/date";

const POSES = [
  { key: "front", label: "Front" },
  { key: "left_side", label: "Left side" },
  { key: "right_side", label: "Right side" },
  { key: "back", label: "Back" },
] as const;

const FIELDS = [
  { key: "arm_cm", label: "Arm (cm)" },
  { key: "chest_cm", label: "Chest (cm)" },
  { key: "waist_cm", label: "Waist (cm)" },
  { key: "hip_cm", label: "Hip (cm)" },
  { key: "thigh_cm", label: "Thigh (cm)" },
] as const;

export default function WeeklyMeasurementForm() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [weekDate, setWeekDate] = useState(todayLocalISODate());
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const hasPhoto = POSES.some((p) => photos[p.key]);
    if (!hasPhoto) {
      setError("At least one progress photo is required.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.set("week_date", weekDate);
    for (const field of FIELDS) {
      if (values[field.key]) formData.set(field.key, values[field.key]);
    }
    if (notes) formData.set("notes", notes);
    for (const pose of POSES) {
      const file = photos[pose.key];
      if (file) formData.set(pose.key, file);
    }

    const res = await fetch("/api/measurements", { method: "POST", body: formData });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong.");
      return;
    }

    setValues({});
    setNotes("");
    setPhotos({});
    setExpanded(false);
    router.refresh();
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-[14px] py-3.5 text-base font-semibold text-white card-shadow active:opacity-80"
        style={{ backgroundColor: "var(--accent)" }}
      >
        + Log weekly measurements
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[1.375rem] bg-card p-4 card-shadow">
      {error && (
        <p
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={{ backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Week of
        </label>
        <input
          type="date"
          value={weekDate}
          max={todayLocalISODate()}
          onChange={(e) => setWeekDate(e.target.value)}
          required
          className="rounded-xl border px-3 py-2.5 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
            {field.label}
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={values[field.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            className="rounded-xl border px-3 py-2.5 text-base outline-none"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      ))}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-xl border px-3 py-2.5 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Progress photos (at least one)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {POSES.map((pose) => (
            <label
              key={pose.key}
              className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-3 text-center text-xs font-medium"
              style={{ borderColor: "var(--border)", color: photos[pose.key] ? "var(--accent)" : "var(--muted)" }}
            >
              {photos[pose.key] ? "✓ " + pose.label : pose.label}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setPhotos((p) => ({ ...p, [pose.key]: e.target.files?.[0] ?? null }))
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex-1 rounded-xl py-2.5 text-base font-medium"
          style={{ color: "var(--accent)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-[14px] py-2.5 text-base font-semibold text-white active:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
