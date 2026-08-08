// Live Open Food Facts lookups — confirmed against the real API directly
// (not guessed): free-text search only exists on the separate
// search-a-licious service, not the main v2/v3 product API; nutriments
// are already reported per-100g, matching this app's schema convention.
const SEARCH_API = "https://search.openfoodfacts.org/search";
const PRODUCT_API = "https://world.openfoodfacts.org/api/v2/product";
const USER_AGENT = "HealthTrackerApp/1.0 - personal single-user app";
const NUTRIMENT_FIELDS = "code,product_name,brands,nutriments";

export type OffFood = {
  externalId: string; // barcode
  name: string;
  brand: string | null;
  caloriesKcalPer100g: number;
  proteinGPer100g: number;
  carbsGPer100g: number;
  fatGPer100g: number;
  fibreGPer100g: number | null;
};

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
    caloriesKcalPer100g: Number(calories),
    proteinGPer100g: Number(protein),
    carbsGPer100g: Number(carbs),
    fatGPer100g: Number(fat),
    fibreGPer100g: n["fiber_100g"] != null ? Number(n["fiber_100g"]) : null,
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
