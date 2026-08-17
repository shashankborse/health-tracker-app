import { getSupabaseServerClient } from "./supabaseServer";

export type MainExerciseRow = {
  target_sets: number | null;
  target_reps: string | null;
  target_weight_kg: number | null;
  exercises: { name: string } | null;
};

// Shared by Home's and Workouts' own "Today's session" card — one query,
// two callers, same convention as getWeeklyTrainingLoad.
export async function getMainExercisesByDay(
  supabase: ReturnType<typeof getSupabaseServerClient>
): Promise<Record<string, MainExerciseRow[]>> {
  const { data } = await supabase
    .from("plan_exercises")
    .select("plan_day_id, target_sets, target_reps, target_weight_kg, exercises(name)")
    .eq("category", "main")
    .order("sort_order", { ascending: true });

  const byDay: Record<string, MainExerciseRow[]> = {};
  for (const row of (data ?? []) as unknown as (MainExerciseRow & { plan_day_id: string })[]) {
    (byDay[row.plan_day_id] ??= []).push(row);
  }
  return byDay;
}
