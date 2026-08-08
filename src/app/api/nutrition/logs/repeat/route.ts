import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);

// Powers both the swipe gesture and the "Last meal" button — both repeat
// whichever date most recently had entries for this meal type. Copy is
// additive: never deletes/replaces to_date's existing entries, just
// inserts alongside them.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !MEAL_TYPES.has(body.meal_type)) {
    return NextResponse.json({ error: "meal_type must be breakfast, lunch, dinner, or snack." }, { status: 400 });
  }
  if (!body.to_date || !DATE_RE.test(body.to_date)) {
    return NextResponse.json({ error: "to_date must be YYYY-MM-DD." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: lastDateRow, error: lastDateError } = await supabase
    .from("food_log_entries")
    .select("log_date")
    .eq("meal_type", body.meal_type)
    .lt("log_date", body.to_date)
    .order("log_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastDateError) {
    return NextResponse.json({ error: lastDateError.message }, { status: 500 });
  }
  if (!lastDateRow) {
    // No prior history for this meal type yet — a real first-use state,
    // not an error.
    return NextResponse.json({ copied: false });
  }
  const fromDate = lastDateRow.log_date;

  const { data: sourceEntries, error: sourceError } = await supabase
    .from("food_log_entries")
    .select("food_id, quantity_amount")
    .eq("log_date", fromDate)
    .eq("meal_type", body.meal_type);
  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }
  if (!sourceEntries || sourceEntries.length === 0) {
    return NextResponse.json({ copied: false });
  }

  const newRows = sourceEntries.map((e) => ({
    log_date: body.to_date,
    meal_type: body.meal_type,
    food_id: e.food_id,
    quantity_amount: e.quantity_amount,
    client_id: crypto.randomUUID(),
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("food_log_entries")
    .insert(newRows)
    .select("*, foods(*)");
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ copied: true, fromDate, entries: inserted });
}
