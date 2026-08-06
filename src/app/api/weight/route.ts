import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { entry_date, weight_kg, body_fat_pct, note } = body;

  if (typeof entry_date !== "string" || !DATE_RE.test(entry_date)) {
    return NextResponse.json({ error: "entry_date must be YYYY-MM-DD." }, { status: 400 });
  }
  const weightNum = Number(weight_kg);
  if (!Number.isFinite(weightNum) || weightNum < 20 || weightNum > 400) {
    return NextResponse.json({ error: "weight_kg must be a number between 20 and 400." }, { status: 400 });
  }
  let bodyFatNum: number | null = null;
  if (body_fat_pct !== null && body_fat_pct !== undefined && body_fat_pct !== "") {
    bodyFatNum = Number(body_fat_pct);
    if (!Number.isFinite(bodyFatNum) || bodyFatNum < 0 || bodyFatNum > 100) {
      return NextResponse.json({ error: "body_fat_pct must be a number between 0 and 100." }, { status: 400 });
    }
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .upsert(
      {
        entry_date,
        weight_kg: weightNum,
        body_fat_pct: bodyFatNum,
        note: typeof note === "string" && note.trim() ? note.trim() : null,
      },
      { onConflict: "entry_date" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entry: data }, { status: 201 });
}
