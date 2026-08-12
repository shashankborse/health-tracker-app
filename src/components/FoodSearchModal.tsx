"use client";

import { useState } from "react";
import { postWithQueue } from "@/lib/offlineQueue";
import type { Food, FoodLogEntry, FoodSource, MealType } from "@/lib/types";
import BarcodeScannerModal from "./BarcodeScannerModal";

type SearchResult = {
  id: string | null; // null = a live Open Food Facts hit not yet saved locally
  source: FoodSource;
  externalId: string | null;
  name: string;
  brand: string | null;
  servingDescription: string | null;
  defaultServingGrams: number | null;
  quantityUnit: "g" | "ml";
  caloriesKcalPer100g: number;
  proteinGPer100g: number;
  carbsGPer100g: number;
  fatGPer100g: number;
  fibreGPer100g: number | null;
  sugarGPer100g: number | null;
  saturatedFatGPer100g: number | null;
  sodiumMgPer100g: number | null;
  isFavourite: boolean;
};

function foodToResult(food: Food): SearchResult {
  return {
    id: food.id,
    source: food.source,
    externalId: food.external_id,
    name: food.name,
    brand: food.brand,
    servingDescription: food.serving_description,
    defaultServingGrams: food.default_serving_grams,
    quantityUnit: food.quantity_unit,
    caloriesKcalPer100g: food.calories_kcal_per_100g,
    proteinGPer100g: food.protein_g_per_100g,
    carbsGPer100g: food.carbs_g_per_100g,
    fatGPer100g: food.fat_g_per_100g,
    fibreGPer100g: food.fibre_g_per_100g,
    sugarGPer100g: food.sugar_g_per_100g,
    saturatedFatGPer100g: food.saturated_fat_g_per_100g,
    sodiumMgPer100g: food.sodium_mg_per_100g,
    isFavourite: food.is_favourite,
  };
}

export default function FoodSearchModal({
  mealType,
  date,
  onClose,
  onLogged,
  onFavourited,
}: {
  mealType: MealType;
  date: string;
  onClose: () => void;
  onLogged: (entry: FoodLogEntry) => void;
  onFavourited: (food: Food) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanNotFound, setScanNotFound] = useState(false);

  async function runSearch(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/nutrition/foods/search?q=${encodeURIComponent(q.trim())}`);
    setSearching(false);
    if (res.ok) {
      const body = await res.json();
      setResults(body.results);
    }
  }

  async function handleBarcodeDetected(code: string) {
    setShowScanner(false);
    const res = await fetch(`/api/nutrition/foods/barcode?code=${encodeURIComponent(code)}`);
    if (res.ok) {
      const body = await res.json();
      if (body.found) {
        setSelected(body.result as SearchResult);
        return;
      }
    }
    // No match for this barcode — fall back to manual entry, same as a
    // search that comes up empty. Nothing to pre-fill beyond the code
    // itself, which isn't useful to show the user.
    setScanNotFound(true);
    setShowManual(true);
  }

  async function toggleFavourite(result: SearchResult) {
    if (!result.id) return; // can't favourite until it's actually been logged/saved
    const next = !result.isFavourite;
    const res = await fetch(`/api/nutrition/foods/${result.id}/favourite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favourite: next }),
    });
    if (res.ok) {
      const { food } = await res.json();
      setResults((prev) => prev?.map((r) => (r.id === result.id ? { ...r, isFavourite: next } : r)) ?? prev);
      onFavourited(food);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add food</h2>
          <button onClick={onClose} className="px-2 text-2xl leading-none" style={{ color: "var(--muted)" }}>
            ×
          </button>
        </div>

        {selected ? (
          <QuantityStep
            food={selected}
            mealType={mealType}
            date={date}
            onCancel={() => setSelected(null)}
            onLogged={(entry) => {
              onLogged(entry);
              onClose();
            }}
          />
        ) : showManual ? (
          <>
            {scanNotFound && (
              <p className="mb-2 text-sm" style={{ color: "var(--muted)" }}>
                No product found for that barcode — add it manually.
              </p>
            )}
            <ManualEntryForm
              onCancel={() => {
                setShowManual(false);
                setScanNotFound(false);
              }}
              onSaved={(food) => {
                setScanNotFound(false);
                setSelected(foodToResult(food));
              }}
            />
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Search foods…"
                className="flex-1 rounded-xl border px-3 py-2.5 text-base outline-none"
                style={{ borderColor: "var(--border)" }}
              />
              <button
                onClick={() => setShowScanner(true)}
                aria-label="Scan barcode"
                className="rounded-xl border px-3"
                style={{ borderColor: "var(--border)" }}
              >
                <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round">
                  <path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M7 8v8M10 8v8M13 8v8M16 8v8" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              {searching && <p className="text-sm" style={{ color: "var(--muted)" }}>Searching…</p>}
              {!searching && results !== null && results.length === 0 && (
                <p className="text-sm" style={{ color: "var(--muted)" }}>No matches.</p>
              )}
              {(results ?? []).map((r, i) => (
                <div
                  key={`${r.source}-${r.externalId ?? r.id ?? i}`}
                  className="flex items-center gap-2 py-2"
                  style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                >
                  <button className="flex-1 text-left" onClick={() => setSelected(r)}>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {r.brand ? `${r.brand} · ` : ""}
                      {Math.round(r.caloriesKcalPer100g)} kcal / 100{r.quantityUnit}
                    </p>
                  </button>
                  <button
                    onClick={() => toggleFavourite(r)}
                    disabled={!r.id}
                    className="px-1 disabled:opacity-30"
                    aria-label="Favourite"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={20}
                      height={20}
                      fill={r.isFavourite ? "var(--accent)" : "none"}
                      stroke="var(--accent)"
                      strokeWidth={2}
                    >
                      <path d="M12 17.3l-6.2 3.6 1.6-7-5.4-4.7 7.2-.6L12 2l2.8 6.6 7.2.6-5.4 4.7 1.6 7z" />
                    </svg>
                  </button>
                </div>
              ))}

              <button
                onClick={() => setShowManual(true)}
                className="mt-2 text-left text-sm font-medium"
                style={{ color: "var(--accent)" }}
              >
                Can&apos;t find it? Add manually
              </button>
            </div>
          </>
        )}
      </div>

      {showScanner && (
        <BarcodeScannerModal onClose={() => setShowScanner(false)} onDetected={handleBarcodeDetected} />
      )}
    </div>
  );
}

function QuantityStep({
  food,
  mealType,
  date,
  onCancel,
  onLogged,
}: {
  food: SearchResult;
  mealType: MealType;
  date: string;
  onCancel: () => void;
  onLogged: (entry: FoodLogEntry) => void;
}) {
  const [grams, setGrams] = useState(String(food.defaultServingGrams ?? 100));
  const [saving, setSaving] = useState(false);
  const quantity = Number(grams) || 0;
  const previewKcal = Math.round((food.caloriesKcalPer100g * quantity) / 100);

  async function handleConfirm() {
    setSaving(true);
    const clientId = crypto.randomUUID();
    const payload: Record<string, unknown> = {
      log_date: date,
      meal_type: mealType,
      quantity_amount: quantity,
      client_id: clientId,
    };
    if (food.id) {
      payload.food_id = food.id;
    } else {
      payload.new_food = {
        source: food.source,
        external_id: food.externalId,
        name: food.name,
        brand: food.brand,
        quantity_unit: food.quantityUnit,
        calories_kcal_per_100g: food.caloriesKcalPer100g,
        protein_g_per_100g: food.proteinGPer100g,
        carbs_g_per_100g: food.carbsGPer100g,
        fat_g_per_100g: food.fatGPer100g,
        fibre_g_per_100g: food.fibreGPer100g,
        sugar_g_per_100g: food.sugarGPer100g,
        saturated_fat_g_per_100g: food.saturatedFatGPer100g,
        sodium_mg_per_100g: food.sodiumMgPer100g,
      };
    }
    // Live OFF lookups already require connectivity, so this common queue
    // path is mainly what matters for already-known foods; a not-yet-saved
    // OFF item just won't be favouritable from today's list until the next
    // refresh assigns it a real id — an acceptable, rare edge case.
    await postWithQueue("/api/nutrition/logs", payload);
    setSaving(false);
    onLogged({
      clientId,
      id: null,
      mealType,
      quantityAmount: quantity,
      food: {
        id: food.id ?? "",
        name: food.name,
        brand: food.brand,
        quantityUnit: food.quantityUnit,
        caloriesKcalPer100g: food.caloriesKcalPer100g,
        proteinGPer100g: food.proteinGPer100g,
        carbsGPer100g: food.carbsGPer100g,
        fatGPer100g: food.fatGPer100g,
        fibreGPer100g: food.fibreGPer100g,
        sugarGPer100g: food.sugarGPer100g,
        saturatedFatGPer100g: food.saturatedFatGPer100g,
        sodiumMgPer100g: food.sodiumMgPer100g,
      },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold">{food.name}</p>
      {food.servingDescription && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {food.servingDescription}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Quantity ({food.quantityUnit})
        </label>
        <input
          type="number"
          inputMode="decimal"
          autoFocus
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          className="rounded-xl border px-3 py-2.5 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
        {previewKcal} kcal
      </p>
      <div className="mt-1 flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-base font-medium" style={{ color: "var(--accent)" }}>
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving || quantity <= 0}
          className="flex-1 rounded-xl py-2.5 text-base font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Logging…" : "Log it"}
        </button>
      </div>
    </div>
  );
}

function ManualEntryForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (food: Food) => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [quantityUnit, setQuantityUnit] = useState<"g" | "ml">("g");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fibre, setFibre] = useState("");
  const [sugar, setSugar] = useState("");
  const [saturatedFat, setSaturatedFat] = useState("");
  const [sodium, setSodium] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/nutrition/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        brand: brand || null,
        quantity_unit: quantityUnit,
        calories_kcal_per_100g: Number(calories),
        protein_g_per_100g: Number(protein),
        carbs_g_per_100g: Number(carbs),
        fat_g_per_100g: Number(fat),
        fibre_g_per_100g: fibre ? Number(fibre) : null,
        sugar_g_per_100g: sugar ? Number(sugar) : null,
        saturated_fat_g_per_100g: saturatedFat ? Number(saturatedFat) : null,
        sodium_mg_per_100g: sodium ? Number(sodium) : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong.");
      return;
    }
    const { food } = await res.json();
    onSaved(food);
  }

  const canSave = name.trim() && calories !== "" && protein !== "" && carbs !== "" && fat !== "";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Enter nutrition per 100{quantityUnit}.
      </p>
      <div className="flex gap-2">
        {(["g", "ml"] as const).map((unit) => (
          <button
            key={unit}
            type="button"
            onClick={() => setQuantityUnit(unit)}
            className="flex-1 rounded-xl py-2 text-sm font-medium"
            style={
              quantityUnit === unit
                ? { backgroundColor: "var(--accent)", color: "white" }
                : { backgroundColor: "color-mix(in srgb, var(--muted) 15%, transparent)" }
            }
          >
            {unit === "g" ? "Solid (g)" : "Liquid (ml)"}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        autoFocus
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <input
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        placeholder="Brand (optional)"
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="Calories (kcal)"
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)" }}
        />
        <input
          type="number"
          inputMode="decimal"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="Protein (g)"
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          placeholder="Carbs (g)"
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)" }}
        />
        <input
          type="number"
          inputMode="decimal"
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          placeholder="Fat (g)"
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={fibre}
        onChange={(e) => setFibre(e.target.value)}
        placeholder="Fibre (g, optional)"
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={sugar}
          onChange={(e) => setSugar(e.target.value)}
          placeholder="Sugar (g, optional)"
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)" }}
        />
        <input
          type="number"
          inputMode="decimal"
          value={saturatedFat}
          onChange={(e) => setSaturatedFat(e.target.value)}
          placeholder="Sat fat (g, optional)"
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={sodium}
        onChange={(e) => setSodium(e.target.value)}
        placeholder="Sodium (mg, optional)"
        className="rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <div className="mt-1 flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2 text-sm font-medium" style={{ color: "var(--accent)" }}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
