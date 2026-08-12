import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { rowsToCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("weight_entries")
    .select("entry_date, weight_kg, body_fat_pct, note, source")
    .order("entry_date", { ascending: true });

  const rows = (data ?? []).map((r) => [r.entry_date, r.weight_kg, r.body_fat_pct, r.note, r.source]);
  const csv = rowsToCsv(["date", "weight_kg", "body_fat_pct", "note", "source"], rows);
  return csvResponse("weight-history.csv", csv);
}
