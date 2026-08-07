import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type RouteContext = { params: Promise<{ id: string }> };

// History is keyed by exercise (the library row), not by a specific day's
// placement — the same exercise done on two different days should show up
// as one combined history, not two fragmented ones.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("exercise_logs")
    .select("*, plan_exercises!inner(exercise_id), workout_sessions(session_date)")
    .eq("plan_exercises.exercise_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ logs: data });
}
