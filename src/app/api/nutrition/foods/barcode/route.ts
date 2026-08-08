import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { lookupBarcode } from "@/lib/openFoodFacts";

type FoodResult = {
  id: string | null;
  source: "cofid" | "restaurant" | "manual" | "off";
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

// Powers the barcode scanner (SPEC.md's P1 barcode-scanning requirement).
// Same response shape as the text-search route, so the client's handling
// of a "found" result is identical either way.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing ?code= barcode." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data: localRow, error } = await supabase
      .from("foods")
      .select("*")
      .eq("external_id", code)
      .maybeSingle();
    if (error) throw new Error(`Local barcode lookup failed: ${error.message}`);

    if (localRow) {
      const result: FoodResult = {
        id: localRow.id,
        source: localRow.source,
        externalId: localRow.external_id,
        name: localRow.name,
        brand: localRow.brand,
        servingDescription: localRow.serving_description,
        defaultServingGrams: localRow.default_serving_grams,
        quantityUnit: localRow.quantity_unit,
        caloriesKcalPer100g: localRow.calories_kcal_per_100g,
        proteinGPer100g: localRow.protein_g_per_100g,
        carbsGPer100g: localRow.carbs_g_per_100g,
        fatGPer100g: localRow.fat_g_per_100g,
        fibreGPer100g: localRow.fibre_g_per_100g,
        sugarGPer100g: localRow.sugar_g_per_100g,
        saturatedFatGPer100g: localRow.saturated_fat_g_per_100g,
        sodiumMgPer100g: localRow.sodium_mg_per_100g,
        isFavourite: localRow.is_favourite,
      };
      return NextResponse.json({ found: true, result });
    }

    const offFood = await lookupBarcode(code);
    if (!offFood) {
      return NextResponse.json({ found: false });
    }

    const result: FoodResult = {
      id: null,
      source: "off",
      externalId: offFood.externalId,
      name: offFood.name,
      brand: offFood.brand,
      servingDescription: null,
      defaultServingGrams: null,
      quantityUnit: offFood.quantityUnit,
      caloriesKcalPer100g: offFood.caloriesKcalPer100g,
      proteinGPer100g: offFood.proteinGPer100g,
      carbsGPer100g: offFood.carbsGPer100g,
      fatGPer100g: offFood.fatGPer100g,
      fibreGPer100g: offFood.fibreGPer100g,
      sugarGPer100g: offFood.sugarGPer100g,
      saturatedFatGPer100g: offFood.saturatedFatGPer100g,
      sodiumMgPer100g: offFood.sodiumMgPer100g,
      isFavourite: false,
    };
    return NextResponse.json({ found: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
