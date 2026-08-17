"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayLocalISODate } from "@/lib/date";
import type { NutritionTargets } from "@/lib/nutritionTargets";
import Card from "./Card";
import MiniBar from "./MiniBar";

// Client-rendered, not server-fetched — deliberately mirrors
// nutrition/page.tsx's exact reasoning: this app never computes "today"
// server-side for nutrition, since Vercel's server clock and the user's
// local Dublin day boundary can disagree right around midnight.
type RawEntry = {
  quantity_amount: number;
  foods: {
    calories_kcal_per_100g: number;
    protein_g_per_100g: number;
    carbs_g_per_100g: number;
    fat_g_per_100g: number;
  };
};

type Totals = { protein: number; carbs: number; fat: number };

function MacroColumn({ label, actual, target, color }: { label: string; actual: number; target?: number; color: string }) {
  const pct = target ? (actual / target) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
      <MiniBar pct={pct} color={color} />
      <p className="text-sm font-semibold tabular-nums">
        {Math.round(actual)}
        {target ? <span style={{ color: "var(--muted)" }}>/{Math.round(target)}g</span> : "g"}
      </p>
    </div>
  );
}

export default function HomeFuelingSummary() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);

  useEffect(() => {
    const today = todayLocalISODate();
    let cancelled = false;
    Promise.all([
      fetch(`/api/nutrition/logs?date=${today}`).then((r) => (r.ok ? r.json() : { entries: [] })),
      fetch(`/api/nutrition/targets?date=${today}`).then((r) => (r.ok ? r.json() : { targets: null })),
    ]).then(([logsBody, targetsBody]) => {
      if (cancelled) return;
      const entries = (logsBody.entries ?? []) as RawEntry[];
      const totals = entries.reduce(
        (acc, e) => {
          const factor = e.quantity_amount / 100;
          acc.protein += e.foods.protein_g_per_100g * factor;
          acc.carbs += e.foods.carbs_g_per_100g * factor;
          acc.fat += e.foods.fat_g_per_100g * factor;
          return acc;
        },
        { protein: 0, carbs: 0, fat: 0 }
      );
      setTotals(totals);
      setTargets(targetsBody.targets);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Fueling
        </p>
        <Link href="/nutrition/nutrients" className="text-sm font-medium" style={{ color: "var(--fuel)" }}>
          Nutrients ›
        </Link>
      </div>
      {totals && (
        <div className="mt-3 grid grid-cols-3 gap-4">
          <MacroColumn label="Protein" actual={totals.protein} target={targets?.protein} color="var(--fuel)" />
          <MacroColumn label="Carbs" actual={totals.carbs} target={targets?.carbs} color="var(--strain)" />
          <MacroColumn label="Fat" actual={totals.fat} target={targets?.fat} color="var(--warn)" />
        </div>
      )}
    </Card>
  );
}
