import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !body.plan_day_id || !body.category || !body.log_type) {
    return NextResponse.json(
      { error: "plan_day_id, category, and log_type are required." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();

  let exerciseId = body.exercise_id as string | undefined;
  if (!exerciseId) {
    const name = (body.new_exercise_name as string | undefined)?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "exercise_id or new_exercise_name is required." },
        { status: 400 }
      );
    }
    const { data: newExercise, error: exerciseError } = await supabase
      .from("exercises")
      .insert({ name, video_url: body.video_url || null })
      .select()
      .single();
    if (exerciseError) {
      return NextResponse.json({ error: exerciseError.message }, { status: 500 });
    }
    exerciseId = newExercise.id;
  }

  const { data: existing } = await supabase
    .from("plan_exercises")
    .select("sort_order")
    .eq("plan_day_id", body.plan_day_id)
    .eq("category", body.category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextSortOrder = (existing?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("plan_exercises")
    .insert({
      plan_day_id: body.plan_day_id,
      exercise_id: exerciseId,
      category: body.category,
      log_type: body.log_type,
      sort_order: nextSortOrder,
      target_sets: body.target_sets || null,
      target_reps: body.target_reps || null,
      target_duration_seconds: body.target_duration_seconds || null,
      notes: body.notes || null,
    })
    .select("*, exercises(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ planExercise: data }, { status: 201 });
}
