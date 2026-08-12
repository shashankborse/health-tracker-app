import Link from "next/link";
import type { NutritionTargets } from "@/lib/nutritionTargets";
import Card from "./Card";

export type DailyTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
};

function MacroBar({ label, actual, target }: { label: string; actual: number; target?: number }) {
  const pct = target ? Math.min(100, (actual / target) * 100) : 0;
  return (
    <div>
      <p className="text-base font-semibold tabular-nums">
        {Math.round(actual)}
        {target ? <span style={{ color: "var(--muted)" }}>/{Math.round(target)}</span> : "g"}
      </p>
      <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
      {target !== undefined && (
        <div className="mt-1 h-1 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--muted) 20%, transparent)" }}>
          <div className="h-1 rounded-full" style={{ width: `${pct}%`, backgroundColor: "var(--accent)" }} />
        </div>
      )}
    </div>
  );
}

export default function DailyTotalsCard({
  totals,
  targets,
}: {
  totals: DailyTotals;
  targets?: NutritionTargets | null;
}) {
  const remaining = targets ? Math.round(targets.calories - totals.calories) : null;

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Today
        </p>
        <Link href="/nutrition/nutrients" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
          Nutrients ›
        </Link>
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums">
        {Math.round(totals.calories)}{" "}
        <span className="text-base font-medium" style={{ color: "var(--muted)" }}>
          {targets ? `/ ${targets.calories} kcal` : "kcal"}
        </span>
      </p>
      {remaining !== null && (
        <p className="mt-0.5 text-sm" style={{ color: remaining >= 0 ? "var(--muted)" : "var(--danger)" }}>
          {remaining >= 0 ? `${remaining} kcal left` : `${Math.abs(remaining)} kcal over`}
          {targets?.usingSyncedBurn ? " · using today's synced burn" : ""}
        </p>
      )}
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <MacroBar label="Protein" actual={totals.protein} target={targets?.protein} />
        <MacroBar label="Carbs" actual={totals.carbs} target={targets?.carbs} />
        <MacroBar label="Fat" actual={totals.fat} target={targets?.fat} />
        <div>
          <p className="text-base font-semibold tabular-nums">{Math.round(totals.fibre)}g</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Fibre</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center" style={{ borderColor: "var(--border)" }}>
        <div>
          <p className="text-sm font-semibold tabular-nums">{Math.round(totals.sugar)}g</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Sugar</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums">{Math.round(totals.saturatedFat)}g</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Sat Fat</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums">{Math.round(totals.sodium)}mg</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Sodium</p>
        </div>
      </div>
    </Card>
  );
}
