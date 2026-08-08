// Live Open Food Facts lookups — confirmed against the real API directly
// (not guessed): free-text search only exists on the separate
// search-a-licious service, not the main v2/v3 product API; nutriments
// are already reported per-100g, matching this app's schema convention.
//
// Liquid-unit detection: the v2 product API's own `product_quantity_unit`
// field looked like the obvious signal, but confirmed live it's silently
// omitted whenever `nutriments` is also requested in the same `fields`
// param unless `quantity` is requested too — and search-a-licious doesn't
// expose `product_quantity_unit` at all, only the raw `quantity` string.
// Parsing that raw string (e.g. "500ml", "33 cl") ourselves works
// identically on both services, so that's what's used instead.
const SEARCH_API = "https://search.openfoodfacts.org/search";
const PRODUCT_API = "https://world.openfoodfacts.org/api/v2/product";
const USER_AGENT = "HealthTrackerApp/1.0 - personal single-user app";
const NUTRIMENT_FIELDS = "code,product_name,brands,nutriments,quantity";

function detectQuantityUnit(quantity: unknown): "g" | "ml" {
  if (typeof quantity !== "string") return "g";
  const match = quantity.match(/(ml|cl|dl|l|g|kg)\b/i);
  if (!match) return "g";
  return ["ml", "cl", "dl", "l"].includes(match[1].toLowerCase()) ? "ml" : "g";
}

export type OffFood = {
  externalId: string; // barcode
  name: string;
  brand: string | null;
  quantityUnit: "g" | "ml";
  caloriesKcalPer100g: number;
  proteinGPer100g: number;
  carbsGPer100g: number;
  fatGPer100g: number;
  fibreGPer100g: number | null;
  sugarGPer100g: number | null;
  saturatedFatGPer100g: number | null;
  sodiumMgPer100g: number | null;
  potassiumMgPer100g: number | null;
  calciumMgPer100g: number | null;
  magnesiumMgPer100g: number | null;
  phosphorusMgPer100g: number | null;
  ironMgPer100g: number | null;
  copperMgPer100g: number | null;
  zincMgPer100g: number | null;
  chlorideMgPer100g: number | null;
  manganeseMgPer100g: number | null;
  seleniumUgPer100g: number | null;
  iodineUgPer100g: number | null;
  vitaminAUgPer100g: number | null;
  vitaminDUgPer100g: number | null;
  vitaminEMgPer100g: number | null;
  vitaminKUgPer100g: number | null;
  thiaminMgPer100g: number | null;
  riboflavinMgPer100g: number | null;
  niacinMgPer100g: number | null;
  vitaminB6MgPer100g: number | null;
  vitaminB12UgPer100g: number | null;
  folateUgPer100g: number | null;
  pantothenateMgPer100g: number | null;
  biotinUgPer100g: number | null;
  vitaminCMgPer100g: number | null;
};

// Open Food Facts reports every nutrient's *_100g field in grams
// regardless of its natural unit — e.g. sodium_100g: 0.0428 means 42.8mg.
// Only ever reads from the primary `nutriments` object, never
// `nutriments_estimated` (a lower-confidence derived value) — same
// "trust reported, don't guess" rule already applied to calories/macros.
function gramsField(n: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    if (n[key] != null) return Number(n[key]);
  }
  return null;
}
function toMilligrams(gramsValue: number | null): number | null {
  return gramsValue == null ? null : gramsValue * 1000;
}
function toMicrograms(gramsValue: number | null): number | null {
  return gramsValue == null ? null : gramsValue * 1_000_000;
}

// Returns null when the product is missing a core macro — callers should
// fall back to manual entry rather than store an incomplete food row.
function extractFood(code: string, product: Record<string, unknown> | undefined): OffFood | null {
  if (!product) return null;
  const n = (product.nutriments ?? {}) as Record<string, unknown>;
  const calories = n["energy-kcal_100g"];
  const protein = n["proteins_100g"];
  const carbs = n["carbohydrates_100g"];
  const fat = n["fat_100g"];
  const name = product.product_name;
  if (calories == null || protein == null || carbs == null || fat == null || !name) return null;

  const brandsRaw = product.brands;
  const brand = Array.isArray(brandsRaw)
    ? (brandsRaw[0] as string | undefined) ?? null
    : typeof brandsRaw === "string" && brandsRaw.trim()
      ? brandsRaw.split(",")[0].trim()
      : null;

  return {
    externalId: code,
    name: String(name),
    brand,
    quantityUnit: detectQuantityUnit(product.quantity),
    caloriesKcalPer100g: Number(calories),
    proteinGPer100g: Number(protein),
    carbsGPer100g: Number(carbs),
    fatGPer100g: Number(fat),
    fibreGPer100g: gramsField(n, "fiber_100g"),
    sugarGPer100g: gramsField(n, "sugars_100g"),
    saturatedFatGPer100g: gramsField(n, "saturated-fat_100g"),
    sodiumMgPer100g: toMilligrams(gramsField(n, "sodium_100g")),
    potassiumMgPer100g: toMilligrams(gramsField(n, "potassium_100g")),
    calciumMgPer100g: toMilligrams(gramsField(n, "calcium_100g")),
    magnesiumMgPer100g: toMilligrams(gramsField(n, "magnesium_100g")),
    phosphorusMgPer100g: toMilligrams(gramsField(n, "phosphorus_100g")),
    ironMgPer100g: toMilligrams(gramsField(n, "iron_100g")),
    copperMgPer100g: toMilligrams(gramsField(n, "copper_100g")),
    zincMgPer100g: toMilligrams(gramsField(n, "zinc_100g")),
    chlorideMgPer100g: toMilligrams(gramsField(n, "chloride_100g")),
    manganeseMgPer100g: toMilligrams(gramsField(n, "manganese_100g")),
    seleniumUgPer100g: toMicrograms(gramsField(n, "selenium_100g")),
    iodineUgPer100g: toMicrograms(gramsField(n, "iodine_100g")),
    vitaminAUgPer100g: toMicrograms(gramsField(n, "vitamin-a_100g")),
    vitaminDUgPer100g: toMicrograms(gramsField(n, "vitamin-d_100g")),
    vitaminEMgPer100g: toMilligrams(gramsField(n, "vitamin-e_100g")),
    vitaminKUgPer100g: toMicrograms(gramsField(n, "vitamin-k_100g", "phylloquinone_100g")),
    thiaminMgPer100g: toMilligrams(gramsField(n, "vitamin-b1_100g")),
    riboflavinMgPer100g: toMilligrams(gramsField(n, "vitamin-b2_100g")),
    niacinMgPer100g: toMilligrams(gramsField(n, "vitamin-pp_100g", "vitamin-b3_100g")),
    vitaminB6MgPer100g: toMilligrams(gramsField(n, "vitamin-b6_100g")),
    vitaminB12UgPer100g: toMicrograms(gramsField(n, "vitamin-b12_100g")),
    folateUgPer100g: toMicrograms(gramsField(n, "vitamin-b9_100g", "folates_100g")),
    pantothenateMgPer100g: toMilligrams(gramsField(n, "pantothenic-acid_100g", "vitamin-b5_100g")),
    biotinUgPer100g: toMicrograms(gramsField(n, "biotin_100g")),
    vitaminCMgPer100g: toMilligrams(gramsField(n, "vitamin-c_100g")),
  };
}

export async function searchFoods(query: string, limit = 20): Promise<OffFood[]> {
  const params = new URLSearchParams({ q: query, page_size: String(limit), fields: NUTRIMENT_FIELDS });
  const res = await fetch(`${SEARCH_API}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Open Food Facts search failed: ${res.status}`);
  const body = await res.json();
  const hits = (body.hits ?? []) as Record<string, unknown>[];
  return hits
    .map((h) => extractFood(String(h.code), h))
    .filter((f): f is OffFood => f !== null);
}

// Returns null for an unknown barcode OR a product missing core macros —
// both cases the caller should route to the manual-entry fallback.
export async function lookupBarcode(barcode: string): Promise<OffFood | null> {
  const params = new URLSearchParams({ fields: NUTRIMENT_FIELDS });
  const res = await fetch(`${PRODUCT_API}/${encodeURIComponent(barcode)}.json?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Open Food Facts lookup failed: ${res.status}`);
  const body = await res.json();
  if (body.status !== 1) return null;
  return extractFood(barcode, body.product);
}
