import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: existing } = await supabase
    .from("plan_days")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextSortOrder = (existing?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("plan_days")
    .insert({
      name: body.name.trim(),
      day_type: body.day_type ?? "rest",
      day_of_week: Number.isInteger(body.day_of_week) ? body.day_of_week : 0,
      description: body.description || null,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ day: data }, { status: 201 });
}
