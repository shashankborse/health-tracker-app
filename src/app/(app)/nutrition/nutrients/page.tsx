"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { todayLocalISODate } from "@/lib/date";
import { NUTRIENT_TARGETS, SODIUM_CEILING_MG, FIBRE_TARGET_G, type NutrientDef } from "@/lib/nutrientTargets";

// Sums straight off the raw `/api/nutrition/logs` response (already
// `select("*, foods(*)")`) rather than the shared, deliberately-narrower
// FoodLogEntry type used elsewhere — this page is the one place that
// actually needs the full 27-column panel, so it reads the raw snake_case
// food row directly instead of pushing 24 unused fields onto every other
// call site.
type RawFood = Record<string, number | string | null>;
type RawEntry = { quantity_amount: number; foods: RawFood };

function sumNutrient(entries: RawEntry[], foodField: string): number {
  return entries.reduce((total, e) => {
    const per100g = e.foods[foodField];
    if (per100g == null) return total;
    return total + (Number(per100g) * e.quantity_amount) / 100;
  }, 0);
}

function NutrientRow({ def, actual }: { def: NutrientDef; actual: number }) {
  const pct = Math.round((actual / def.target) * 100);
  const displayActual = def.unit === "mg" ? Math.round(actual * 10) / 10 : Math.round(actual);
  return (
    <div className="flex flex-col gap-1 py-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{def.label}</p>
        <p className="text-sm">
          <span className="font-semibold">{displayActual}</span>
          <span style={{ color: "var(--muted)" }}>/{def.target} {def.unit}</span>
        </p>
      </div>
      <div className="h-1.5 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--muted) 20%, transparent)" }}>
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            backgroundColor: pct >= 100 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 70%, transparent)",
          }}
        />
      </div>
      <p className="text-xs" style={{ color: pct >= 100 ? "var(--accent)" : "var(--muted)" }}>{pct}%</p>
    </div>
  );
}

export default function NutrientsPage() {
  const [entries, setEntries] = useState<RawEntry[] | null>(null);
  const [error, setError] = useState(false);
  const today = todayLocalISODate();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/nutrition/logs?date=${today}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) => !cancelled && setEntries(body.entries as RawEntry[]))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [today]);

  const list = entries ?? [];
  const actuals = NUTRIENT_TARGETS.map((def) => ({ def, actual: sumNutrient(list, def.foodField) }));
  const met = actuals.filter((a) => a.actual >= a.def.target).length;
  const completePct = Math.round((met / NUTRIENT_TARGETS.length) * 100);
  const short = actuals
    .filter((a) => a.actual < a.def.target)
    .sort((a, b) => a.actual / a.def.target - b.actual / b.def.target)
    .slice(0, 4)
    .map((a) => a.def.label);

  const fibre = sumNutrient(list, "fibre_g_per_100g");
  const sodium = sumNutrient(list, "sodium_mg_per_100g");

  return (
    <main className="flex flex-col gap-5 px-4 pt-6">
      <div className="flex items-center gap-2 px-1">
        <Link href="/nutrition" aria-label="Back to Nutrition" className="active:opacity-60">
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nutrients</h1>
      </div>
      <p className="px-1 text-sm" style={{ color: "var(--muted)" }}>
        The nutrients most commonly under-met on an Indian diet, not the full panel.
      </p>

      {error && (
        <p className="rounded-2xl bg-card p-4 text-sm shadow-sm" style={{ color: "var(--danger)" }}>
          Couldn&apos;t load today&apos;s nutrients.
        </p>
      )}

      {entries === null && !error ? (
        <p className="px-1 text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
      ) : (
        <>
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Daily coverage
              </p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{met}/{NUTRIENT_TARGETS.length} met</p>
            </div>
            <p className="mt-1 text-3xl font-bold">{completePct}%</p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {short.length > 0
                ? `Still short on ${short.join(", ")}.`
                : "All tracked vitamin and mineral targets met today."}
            </p>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Vitamins</p>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {actuals.filter((a) => a.def.group === "vitamin").map(({ def, actual }) => (
                <NutrientRow key={def.label} def={def} actual={actual} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Minerals & electrolytes</p>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {actuals.filter((a) => a.def.group === "mineral").map(({ def, actual }) => (
                <NutrientRow key={def.label} def={def} actual={actual} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Gut health</p>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">Fibre</p>
              <p className="text-sm">
                <span className="font-semibold">{Math.round(fibre)}</span>
                <span style={{ color: "var(--muted)" }}>/{FIBRE_TARGET_G}g</span>
              </p>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <p className="text-sm font-medium">Sodium</p>
              <p className="text-sm">
                <span className="font-semibold" style={{ color: sodium > SODIUM_CEILING_MG ? "var(--danger)" : undefined }}>
                  {Math.round(sodium)}
                </span>
                <span style={{ color: "var(--muted)" }}>/{SODIUM_CEILING_MG}mg ceiling</span>
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
