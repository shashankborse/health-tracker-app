"use client";

import { useEffect, useState } from "react";
import { postWithQueue, deleteLoggedSet } from "@/lib/offlineQueue";
import { todayLocalISODate } from "@/lib/date";

type Timing = "am" | "pm" | "with_meal";

type Supplement = {
  id: string;
  name: string;
  dose_description: string | null;
  purpose: string | null;
  timing: Timing;
  logged_client_id: string | null;
};

const TIMING_LABELS: Record<Timing, string> = { am: "Morning", pm: "Evening", with_meal: "With meals" };
const TIMING_ORDER: Timing[] = ["am", "with_meal", "pm"];

export default function SupplementStack() {
  const [supplements, setSupplements] = useState<Supplement[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const today = todayLocalISODate();

  function refetch() {
    fetch(`/api/nutrition/supplements?date=${today}`)
      .then((r) => (r.ok ? r.json() : { supplements: [] }))
      .then((body) => setSupplements(body.supplements));
  }

  useEffect(refetch, [today]);

  async function handleToggle(supplement: Supplement) {
    if (supplement.logged_client_id) {
      const clientId = supplement.logged_client_id;
      setSupplements((prev) => prev?.map((s) => (s.id === supplement.id ? { ...s, logged_client_id: null } : s)) ?? null);
      await deleteLoggedSet("/api/nutrition/supplements/log", clientId);
    } else {
      const clientId = crypto.randomUUID();
      setSupplements((prev) => prev?.map((s) => (s.id === supplement.id ? { ...s, logged_client_id: clientId } : s)) ?? null);
      await postWithQueue("/api/nutrition/supplements/log", {
        supplement_id: supplement.id,
        log_date: today,
        client_id: clientId,
      });
    }
  }

  if (supplements === null) return null;

  const grouped = TIMING_ORDER.map((timing) => ({
    timing,
    items: supplements.filter((s) => s.timing === timing),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        Stack
      </p>

      {supplements.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>No supplements added yet.</p>
      )}

      {grouped.map((group) => (
        <div key={group.timing} className="mt-3">
          <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>{TIMING_LABELS[group.timing]}</p>
          <div className="mt-1 flex flex-col gap-1.5">
            {group.items.map((s) => {
              const logged = !!s.logged_client_id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleToggle(s)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left"
                  style={{
                    backgroundColor: logged
                      ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                      : "color-mix(in srgb, var(--muted) 10%, transparent)",
                  }}
                >
                  <span>
                    <span className="text-sm font-medium">{s.name}</span>
                    {(s.dose_description || s.purpose) && (
                      <span className="ml-1.5 text-xs" style={{ color: "var(--muted)" }}>
                        {[s.dose_description, s.purpose].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: logged ? "var(--accent)" : "var(--muted)" }}>
                    {logged ? "Logged" : "Log"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {showAdd ? (
        <AddSupplementForm onDone={() => { setShowAdd(false); refetch(); }} onCancel={() => setShowAdd(false)} />
      ) : (
        <button onClick={() => setShowAdd(true)} className="mt-3 text-sm font-medium" style={{ color: "var(--accent)" }}>
          + Add supplement
        </button>
      )}
    </div>
  );
}

function AddSupplementForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [purpose, setPurpose] = useState("");
  const [timing, setTiming] = useState<Timing>("am");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/nutrition/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dose_description: dose || null, purpose: purpose || null, timing }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      {error && (
        <p
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={{ backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
        >
          {error}
        </p>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (e.g. Creatine)"
        autoFocus
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <input
        value={dose}
        onChange={(e) => setDose(e.target.value)}
        placeholder="Dose (e.g. 5g)"
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <input
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="Purpose (optional)"
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <div className="flex gap-2">
        {(["am", "with_meal", "pm"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTiming(t)}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-medium"
            style={{
              backgroundColor: timing === t ? "var(--accent)" : "color-mix(in srgb, var(--muted) 12%, transparent)",
              color: timing === t ? "white" : "var(--foreground)",
            }}
          >
            {TIMING_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2 text-sm font-medium" style={{ color: "var(--accent)" }}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
