import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const SEX_VALUES = new Set(["male", "female"]);
const GOAL_VALUES = new Set(["fat_loss", "maintenance", "muscle_gain"]);
const MEAL_DIST_VALUES = new Set(["2_meal", "4_meal"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("user_profile").select("*").eq("id", "default").maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { height_cm, date_of_birth, biological_sex, activity_multiplier, fitness_goal, meal_distribution } = body;

  const update: Record<string, unknown> = { id: "default", updated_at: new Date().toISOString() };

  if (height_cm !== undefined) {
    const n = Number(height_cm);
    if (!Number.isFinite(n) || n < 50 || n > 250) {
      return NextResponse.json({ error: "height_cm must be a number between 50 and 250." }, { status: 400 });
    }
    update.height_cm = n;
  }
  if (date_of_birth !== undefined) {
    if (typeof date_of_birth !== "string" || !DATE_RE.test(date_of_birth)) {
      return NextResponse.json({ error: "date_of_birth must be YYYY-MM-DD." }, { status: 400 });
    }
    update.date_of_birth = date_of_birth;
  }
  if (biological_sex !== undefined) {
    if (!SEX_VALUES.has(biological_sex)) {
      return NextResponse.json({ error: "biological_sex must be male or female." }, { status: 400 });
    }
    update.biological_sex = biological_sex;
  }
  if (activity_multiplier !== undefined) {
    const n = Number(activity_multiplier);
    if (!Number.isFinite(n) || n < 1 || n > 2.5) {
      return NextResponse.json({ error: "activity_multiplier must be a number between 1 and 2.5." }, { status: 400 });
    }
    update.activity_multiplier = n;
  }
  if (fitness_goal !== undefined) {
    if (!GOAL_VALUES.has(fitness_goal)) {
      return NextResponse.json({ error: "fitness_goal must be fat_loss, maintenance, or muscle_gain." }, { status: 400 });
    }
    update.fitness_goal = fitness_goal;
  }
  if (meal_distribution !== undefined) {
    if (!MEAL_DIST_VALUES.has(meal_distribution)) {
      return NextResponse.json({ error: "meal_distribution must be 2_meal or 4_meal." }, { status: 400 });
    }
    update.meal_distribution = meal_distribution;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("user_profile").upsert(update, { onConflict: "id" }).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
