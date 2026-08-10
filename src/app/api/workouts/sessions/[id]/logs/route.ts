import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type RouteContext = { params: Promise<{ id: string }> };

// Pre-populates the live session screen (src/components/LiveSessionClient.tsx)
// with whatever's already logged for this session — including sets logged
// via the older per-exercise-card flow — so opening the live session view
// mid-workout doesn't lose track of confirmed sets or risk re-logging them.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("exercise_logs")
    .select("client_id, plan_exercise_id, set_number, actual_reps, weight_kg, rpe")
    .eq("session_id", id)
    .order("set_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ logs: data });
}
