import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);

// "Today" is always determined client-side (todayLocalISODate()), never
// here — this app deliberately never computes "today" server-side, since
// Vercel's server clock and the user's local (Dublin) day boundary can
// disagree right around midnight. This route just takes whatever date the
// client asks for.
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "?date=YYYY-MM-DD is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("food_log_entries")
    .select("*, foods(*)")
    .eq("log_date", date)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.log_date || !DATE_RE.test(body.log_date)) {
    return NextResponse.json({ error: "log_date must be YYYY-MM-DD." }, { status: 400 });
  }
  if (!MEAL_TYPES.has(body.meal_type)) {
    return NextResponse.json({ error: "meal_type must be breakfast, lunch, dinner, or snack." }, { status: 400 });
  }
  if (!body.client_id || !body.quantity_amount) {
    return NextResponse.json({ error: "client_id and quantity_amount are required." }, { status: 400 });
  }
  if (!body.food_id && !body.new_food) {
    return NextResponse.json({ error: "Either food_id or new_food is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  let foodId = body.food_id as string | undefined;

  // A live Open Food Facts hit not yet saved locally — save it now, keyed
  // on (source, external_id) so logging the same product twice reuses one
  // row rather than creating a duplicate.
  if (!foodId && body.new_food) {
    const nf = body.new_food;
    const { data: food, error: foodError } = await supabase
      .from("foods")
      .upsert(
        {
          source: nf.source,
          external_id: nf.external_id,
          name: nf.name,
          brand: nf.brand ?? null,
          calories_kcal_per_100g: nf.calories_kcal_per_100g,
          protein_g_per_100g: nf.protein_g_per_100g,
          carbs_g_per_100g: nf.carbs_g_per_100g,
          fat_g_per_100g: nf.fat_g_per_100g,
          fibre_g_per_100g: nf.fibre_g_per_100g ?? null,
          sugar_g_per_100g: nf.sugar_g_per_100g ?? null,
          saturated_fat_g_per_100g: nf.saturated_fat_g_per_100g ?? null,
          sodium_mg_per_100g: nf.sodium_mg_per_100g ?? null,
          quantity_unit: nf.quantity_unit ?? "g",
        },
        { onConflict: "source,external_id" }
      )
      .select()
      .single();
    if (foodError || !food) {
      return NextResponse.json({ error: foodError?.message || "Failed to save food." }, { status: 500 });
    }
    foodId = food.id;
  }

  const { data, error } = await supabase
    .from("food_log_entries")
    .upsert(
      {
        log_date: body.log_date,
        meal_type: body.meal_type,
        food_id: foodId,
        quantity_amount: body.quantity_amount,
        client_id: body.client_id,
      },
      { onConflict: "client_id" }
    )
    .select("*, foods(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entry: data }, { status: 201 });
}

// Deletes by client_id rather than server id — same reasoning as
// exercise_logs: a just-removed entry might still only exist in the
// offline queue, never having reached the server.
export async function DELETE(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id is required." }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("food_log_entries").delete().eq("client_id", clientId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
