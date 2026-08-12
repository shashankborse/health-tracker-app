import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { rowsToCsv, csvResponse } from "@/lib/csv";

type FoodLogRow = {
  log_date: string;
  meal_type: string;
  quantity_amount: number;
  foods: {
    name: string;
    quantity_unit: string;
    calories_kcal_per_100g: number;
    protein_g_per_100g: number;
    carbs_g_per_100g: number;
    fat_g_per_100g: number;
    fibre_g_per_100g: number | null;
  } | null;
};

function scale(per100g: number | null, quantityAmount: number): string {
  if (per100g == null) return "";
  return (Math.round(((per100g * quantityAmount) / 100) * 10) / 10).toString();
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("food_log_entries")
    .select(
      "log_date, meal_type, quantity_amount, foods(name, quantity_unit, calories_kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fibre_g_per_100g)"
    )
    .order("log_date", { ascending: true });

  const rows = ((data ?? []) as unknown as FoodLogRow[]).map((entry) => [
    entry.log_date,
    entry.meal_type,
    entry.foods?.name ?? "",
    entry.quantity_amount,
    entry.foods?.quantity_unit ?? "",
    scale(entry.foods?.calories_kcal_per_100g ?? null, entry.quantity_amount),
    scale(entry.foods?.protein_g_per_100g ?? null, entry.quantity_amount),
    scale(entry.foods?.carbs_g_per_100g ?? null, entry.quantity_amount),
    scale(entry.foods?.fat_g_per_100g ?? null, entry.quantity_amount),
    scale(entry.foods?.fibre_g_per_100g ?? null, entry.quantity_amount),
  ]);

  const headers = ["date", "meal_type", "food", "quantity_amount", "quantity_unit", "calories_kcal", "protein_g", "carbs_g", "fat_g", "fibre_g"];
  const csv = rowsToCsv(headers, rows);
  return csvResponse("nutrition-history.csv", csv);
}
