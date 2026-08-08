import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// Powers the quick-add row — favourited foods only, newest-favourited first.
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("favourite") !== "true") {
    return NextResponse.json({ error: "Only ?favourite=true is supported." }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("is_favourite", true)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ foods: data });
}

// Manual food entry — the fallback when a barcode scan/search returns no
// match or an Open Food Facts product is missing core macros (see
// src/lib/openFoodFacts.ts). Creates a `source: 'manual'` food, usable and
// favouritable exactly like any other food from then on.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const required = ["calories_kcal_per_100g", "protein_g_per_100g", "carbs_g_per_100g", "fat_g_per_100g"];
  for (const field of required) {
    if (body[field] == null || Number.isNaN(Number(body[field]))) {
      return NextResponse.json({ error: `${field} must be a number.` }, { status: 400 });
    }
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("foods")
    .insert({
      source: "manual",
      name: body.name,
      brand: body.brand ?? null,
      serving_description: body.serving_description ?? null,
      default_serving_grams: body.default_serving_grams ?? null,
      quantity_unit: body.quantity_unit === "ml" ? "ml" : "g",
      calories_kcal_per_100g: body.calories_kcal_per_100g,
      protein_g_per_100g: body.protein_g_per_100g,
      carbs_g_per_100g: body.carbs_g_per_100g,
      fat_g_per_100g: body.fat_g_per_100g,
      fibre_g_per_100g: body.fibre_g_per_100g ?? null,
      sugar_g_per_100g: body.sugar_g_per_100g ?? null,
      saturated_fat_g_per_100g: body.saturated_fat_g_per_100g ?? null,
      sodium_mg_per_100g: body.sodium_mg_per_100g ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ food: data }, { status: 201 });
}
