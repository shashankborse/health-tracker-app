"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { todayLocalISODate } from "@/lib/date";

export default function WeightEntryForm() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [date, setDate] = useState(todayLocalISODate());
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry_date: date,
        weight_kg: weight,
        body_fat_pct: bodyFat || null,
        note: note || null,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong.");
      return;
    }

    setWeight("");
    setBodyFat("");
    setNote("");
    setExpanded(false);
    router.refresh();
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-2xl py-3.5 text-base font-semibold text-white shadow-sm active:opacity-80"
        style={{ backgroundColor: "var(--accent)" }}
      >
        + Log weight
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm"
    >
      {error && (
        <p
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={{
            backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)",
            color: "var(--danger)",
          }}
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Date
        </label>
        <input
          type="date"
          value={date}
          max={todayLocalISODate()}
          onChange={(e) => setDate(e.target.value)}
          required
          className="rounded-xl border px-3 py-2.5 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Weight (kg)
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          required
          autoFocus
          className="rounded-xl border px-3 py-2.5 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Body fat % (optional)
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={bodyFat}
          onChange={(e) => setBodyFat(e.target.value)}
          className="rounded-xl border px-3 py-2.5 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Note (optional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-xl border px-3 py-2.5 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        />
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
          className="flex-1 rounded-xl py-2.5 text-base font-semibold text-white active:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
