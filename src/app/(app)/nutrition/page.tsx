"use client";

import { useEffect, useState } from "react";
import { todayLocalISODate } from "@/lib/date";
import type { Food, FoodLogEntry, MealType } from "@/lib/types";
import DailyTotalsCard, { type DailyTotals } from "@/components/DailyTotalsCard";
import MealSection from "@/components/MealSection";

// Client-rendered, not server-fetched: this app deliberately never computes
// "today" server-side (see src/app/api/nutrition/logs/route.ts) since
// Vercel's server clock and the user's local Dublin day boundary can
// disagree right around midnight.
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

type RawEntry = {
  client_id: string;
  id: string;
  meal_type: MealType;
  quantity_amount: number;
  foods: {
    id: string;
    name: string;
    brand: string | null;
    quantity_unit: "g" | "ml";
    calories_kcal_per_100g: number;
    protein_g_per_100g: number;
    carbs_g_per_100g: number;
    fat_g_per_100g: number;
    fibre_g_per_100g: number | null;
    sugar_g_per_100g: number | null;
    saturated_fat_g_per_100g: number | null;
    sodium_mg_per_100g: number | null;
  };
};

function toEntry(raw: RawEntry): FoodLogEntry {
  return {
    clientId: raw.client_id,
    id: raw.id,
    mealType: raw.meal_type,
    quantityAmount: raw.quantity_amount,
    food: {
      id: raw.foods.id,
      name: raw.foods.name,
      brand: raw.foods.brand,
      quantityUnit: raw.foods.quantity_unit,
      caloriesKcalPer100g: raw.foods.calories_kcal_per_100g,
      proteinGPer100g: raw.foods.protein_g_per_100g,
      carbsGPer100g: raw.foods.carbs_g_per_100g,
      fatGPer100g: raw.foods.fat_g_per_100g,
      fibreGPer100g: raw.foods.fibre_g_per_100g,
      sugarGPer100g: raw.foods.sugar_g_per_100g,
      saturatedFatGPer100g: raw.foods.saturated_fat_g_per_100g,
      sodiumMgPer100g: raw.foods.sodium_mg_per_100g,
    },
  };
}

export default function NutritionPage() {
  const [entries, setEntries] = useState<FoodLogEntry[] | null>(null);
  const [favourites, setFavourites] = useState<Food[]>([]);
  const [error, setError] = useState(false);
  const today = todayLocalISODate();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/nutrition/logs?date=${today}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/nutrition/foods?favourite=true").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([logsBody, foodsBody]) => {
        if (cancelled) return;
        setEntries((logsBody.entries as RawEntry[]).map(toEntry));
        setFavourites(foodsBody.foods as Food[]);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [today]);

  function handleAdded(entry: FoodLogEntry) {
    setEntries((prev) => [...(prev ?? []), entry]);
  }

  function handleRemoved(clientId: string) {
    setEntries((prev) => (prev ?? []).filter((e) => e.clientId !== clientId));
  }

  function handleFavourited(food: Food) {
    setFavourites((prev) => {
      if (food.is_favourite) return prev.some((f) => f.id === food.id) ? prev : [food, ...prev];
      return prev.filter((f) => f.id !== food.id);
    });
  }

  const totals: DailyTotals = (entries ?? []).reduce(
    (acc, e) => {
      const factor = e.quantityAmount / 100;
      acc.calories += e.food.caloriesKcalPer100g * factor;
      acc.protein += e.food.proteinGPer100g * factor;
      acc.carbs += e.food.carbsGPer100g * factor;
      acc.fat += e.food.fatGPer100g * factor;
      acc.fibre += (e.food.fibreGPer100g ?? 0) * factor;
      acc.sugar += (e.food.sugarGPer100g ?? 0) * factor;
      acc.saturatedFat += (e.food.saturatedFatGPer100g ?? 0) * factor;
      acc.sodium += (e.food.sodiumMgPer100g ?? 0) * factor;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0, saturatedFat: 0, sodium: 0 }
  );

  return (
    <main className="flex flex-col gap-5 px-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight px-1">Nutrition</h1>

      {error && (
        <p className="rounded-2xl bg-card p-4 text-sm shadow-sm" style={{ color: "var(--danger)" }}>
          Couldn&apos;t load today&apos;s log.
        </p>
      )}

      {entries === null && !error ? (
        <p className="px-1 text-sm" style={{ color: "var(--muted)" }}>
          Loading…
        </p>
      ) : (
        <>
          <DailyTotalsCard totals={totals} />
          {MEAL_TYPES.map((mealType) => (
            <MealSection
              key={mealType}
              label={MEAL_LABELS[mealType]}
              mealType={mealType}
              date={today}
              entries={(entries ?? []).filter((e) => e.mealType === mealType)}
              favourites={favourites}
              onAdded={handleAdded}
              onRemoved={handleRemoved}
              onFavourited={handleFavourited}
            />
          ))}
        </>
      )}
    </main>
  );
}
