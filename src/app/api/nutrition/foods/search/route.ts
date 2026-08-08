import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { searchFoods } from "@/lib/openFoodFacts";

const LOCAL_LIMIT = 20;
const OFF_LIMIT = 15;
const TOTAL_LIMIT = 30;

type FoodResult = {
  id: string | null; // null when not yet saved locally (a fresh Open Food Facts hit)
  source: "cofid" | "restaurant" | "manual" | "off";
  externalId: string | null;
  name: string;
  brand: string | null;
  servingDescription: string | null;
  defaultServingGrams: number | null;
  caloriesKcalPer100g: number;
  proteinGPer100g: number;
  carbsGPer100g: number;
  fatGPer100g: number;
  fibreGPer100g: number | null;
  isFavourite: boolean;
};

// Merges already-known local foods (CoFID/restaurant/manual/previously-
// saved OFF items) with a live Open Food Facts search — only saved once
// actually logged (see openFoodFacts.ts), so a fresh OFF hit here has no
// `id` yet.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing ?q= query." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data: localRows, error } = await supabase
      .from("foods")
      .select("*")
      .ilike("name", `%${q}%`)
      .order("is_favourite", { ascending: false })
      .limit(LOCAL_LIMIT);
    if (error) throw new Error(`Local food search failed: ${error.message}`);

    const local: FoodResult[] = (localRows ?? []).map((r) => ({
      id: r.id,
      source: r.source,
      externalId: r.external_id,
      name: r.name,
      brand: r.brand,
      servingDescription: r.serving_description,
      defaultServingGrams: r.default_serving_grams,
      caloriesKcalPer100g: r.calories_kcal_per_100g,
      proteinGPer100g: r.protein_g_per_100g,
      carbsGPer100g: r.carbs_g_per_100g,
      fatGPer100g: r.fat_g_per_100g,
      fibreGPer100g: r.fibre_g_per_100g,
      isFavourite: r.is_favourite,
    }));

    const knownOffIds = new Set(local.filter((f) => f.source === "off").map((f) => f.externalId));
    const offHits = await searchFoods(q, OFF_LIMIT);
    const freshOff: FoodResult[] = offHits
      .filter((f) => !knownOffIds.has(f.externalId))
      .map((f) => ({
        id: null,
        source: "off" as const,
        externalId: f.externalId,
        name: f.name,
        brand: f.brand,
        servingDescription: null,
        defaultServingGrams: null,
        caloriesKcalPer100g: f.caloriesKcalPer100g,
        proteinGPer100g: f.proteinGPer100g,
        carbsGPer100g: f.carbsGPer100g,
        fatGPer100g: f.fatGPer100g,
        fibreGPer100g: f.fibreGPer100g,
        isFavourite: false,
      }));

    const results = [...local, ...freshOff].slice(0, TOTAL_LIMIT);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
