"use client";

import { useEffect, useRef, useState } from "react";
import { postWithQueue, deleteLoggedSet } from "@/lib/offlineQueue";
import type { Food, FoodLogEntry, MealType } from "@/lib/types";
import FoodSearchModal from "./FoodSearchModal";

const SWIPE_THRESHOLD = 80;
const SWIPE_MAX = 110;

type RawRepeatEntry = {
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

function toEntry(raw: RawRepeatEntry): FoodLogEntry {
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

export default function MealSection({
  label,
  mealType,
  date,
  entries,
  favourites,
  onAdded,
  onRemoved,
  onFavourited,
}: {
  label: string;
  mealType: MealType;
  date: string;
  entries: FoodLogEntry[];
  favourites: Food[];
  onAdded: (entry: FoodLogEntry) => void;
  onRemoved: (clientId: string) => void;
  onFavourited: (food: Food) => void;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [repeatMessage, setRepeatMessage] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const swipeDistanceRef = useRef(0);
  const repeatingRef = useRef(false);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [snapping, setSnapping] = useState(false);

  // Single tap, no search required — logs the food's default serving
  // immediately; if the amount was actually different today, edit it from
  // the list afterward (remove + re-add with the search flow).
  async function handleQuickAdd(food: Food) {
    const clientId = crypto.randomUUID();
    const quantity = food.default_serving_grams ?? 100;
    await postWithQueue("/api/nutrition/logs", {
      log_date: date,
      meal_type: mealType,
      quantity_amount: quantity,
      client_id: clientId,
      food_id: food.id,
    });
    onAdded({
      clientId,
      id: null,
      mealType,
      quantityAmount: quantity,
      food: {
        id: food.id,
        name: food.name,
        brand: food.brand,
        quantityUnit: food.quantity_unit,
        caloriesKcalPer100g: food.calories_kcal_per_100g,
        proteinGPer100g: food.protein_g_per_100g,
        carbsGPer100g: food.carbs_g_per_100g,
        fatGPer100g: food.fat_g_per_100g,
        fibreGPer100g: food.fibre_g_per_100g,
        sugarGPer100g: food.sugar_g_per_100g,
        saturatedFatGPer100g: food.saturated_fat_g_per_100g,
        sodiumMgPer100g: food.sodium_mg_per_100g,
      },
    });
  }

  async function handleRemove(clientId: string) {
    onRemoved(clientId);
    await deleteLoggedSet("/api/nutrition/logs", clientId);
  }

  // Shared by the swipe gesture and the "Last meal" button — both repeat
  // whichever date most recently had entries for this meal type. Needs a
  // real response to know what happened, so a plain awaited fetch rather
  // than the offline queue.
  async function handleRepeat() {
    setRepeating(true);
    setRepeatMessage(null);
    try {
      const res = await fetch("/api/nutrition/logs/repeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_type: mealType, to_date: date }),
      });
      if (!res.ok) {
        setRepeatMessage("Something went wrong. Please try again.");
        return;
      }
      const body = await res.json();
      if (!body.copied) {
        setRepeatMessage(`No previous ${label.toLowerCase()} to repeat.`);
        return;
      }
      for (const raw of body.entries as RawRepeatEntry[]) {
        onAdded(toEntry(raw));
      }
    } finally {
      setRepeating(false);
      window.setTimeout(() => setRepeatMessage(null), 3000);
    }
  }

  useEffect(() => {
    repeatingRef.current = repeating;
  }, [repeating]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (repeatingRef.current) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      draggingRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startX.current === null || startY.current === null || repeatingRef.current) return;
      const deltaX = e.touches[0].clientX - startX.current;
      const deltaY = e.touches[0].clientY - startY.current;

      // Only take over once a real horizontal swipe is clear — otherwise
      // this would fight normal vertical page scrolling (same dominant-
      // axis reasoning as PullToRefresh.tsx, applied to the X axis here).
      if (!draggingRef.current) {
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;
        if (Math.abs(deltaX) <= Math.abs(deltaY)) {
          startX.current = null;
          return;
        }
        draggingRef.current = true;
      }
      if (deltaX <= 0) return;

      setSnapping(false);
      const distance = Math.min(deltaX, SWIPE_MAX);
      swipeDistanceRef.current = distance;
      setSwipeDistance(distance);
      e.preventDefault();
    }

    function onTouchEnd() {
      if (!draggingRef.current) {
        startX.current = null;
        startY.current = null;
        return;
      }
      startX.current = null;
      startY.current = null;
      draggingRef.current = false;
      setSnapping(true);
      if (swipeDistanceRef.current >= SWIPE_THRESHOLD) {
        handleRepeat();
      }
      swipeDistanceRef.current = 0;
      setSwipeDistance(0);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
    // Attached once, not re-attached per drag frame — handlers read fresh
    // values via refs (see PullToRefresh.tsx for the same pattern).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swipeProgress = Math.min(swipeDistance / SWIPE_THRESHOLD, 1);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </h2>

      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 flex items-center pl-4"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) " + (12 + swipeProgress * 20) + "%, transparent)" }}
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            width={22}
            height={22}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: swipeProgress, transform: `scale(${0.7 + swipeProgress * 0.3})` }}
          >
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
          </svg>
        </div>

        <div
          ref={cardRef}
          className="relative bg-card p-4 shadow-sm"
          style={{
            transform: `translateX(${swipeDistance}px)`,
            transition: snapping ? "transform 220ms cubic-bezier(0.25, 1, 0.5, 1)" : undefined,
          }}
        >
          {favourites.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {favourites.map((food) => (
                <button
                  key={food.id}
                  onClick={() => handleQuickAdd(food)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
                >
                  + {food.name}
                </button>
              ))}
            </div>
          )}

          {entries.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Nothing logged yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map((entry) => (
                <div key={entry.clientId} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{entry.food.name}</p>
                    <p style={{ color: "var(--muted)" }}>
                      {entry.quantityAmount}{entry.food.quantityUnit} ·{" "}
                      {Math.round((entry.food.caloriesKcalPer100g * entry.quantityAmount) / 100)} kcal
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(entry.clientId)}
                    style={{ color: "var(--danger)" }}
                    aria-label={`Remove ${entry.food.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {repeatMessage && (
            <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
              {repeatMessage}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="flex-1 rounded-xl border border-dashed py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--accent)" }}
            >
              + Add food
            </button>
            <button
              onClick={() => handleRepeat()}
              disabled={repeating}
              className="rounded-xl border border-dashed px-3 text-sm font-medium disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              {repeating ? "…" : "Last meal"}
            </button>
          </div>
        </div>
      </div>

      {showSearch && (
        <FoodSearchModal
          mealType={mealType}
          date={date}
          onClose={() => setShowSearch(false)}
          onLogged={onAdded}
          onFavourited={onFavourited}
        />
      )}
    </section>
  );
}
