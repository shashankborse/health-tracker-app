import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { PlanDay } from "@/lib/types";
import { getWeeklyTrainingLoad } from "@/lib/trainingLoad";
import { getMainExercisesByDay } from "@/lib/mainExercisesByDay";
import WorkoutsListClient from "@/components/WorkoutsListClient";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const supabase = getSupabaseServerClient();

  const { data: days } = await supabase
    .from("plan_days")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: exerciseCounts } = await supabase
    .from("plan_exercises")
    .select("plan_day_id");

  const countByDay = new Map<string, number>();
  for (const row of exerciseCounts ?? []) {
    countByDay.set(row.plan_day_id, (countByDay.get(row.plan_day_id) ?? 0) + 1);
  }

  // Dashboard needs the 7-day bar chart; the fuller muscle-group
  // breakdown still lives on /workouts/training-load.
  const { dailyTonnage } = await getWeeklyTrainingLoad(supabase);
  const mainExercisesByDay = await getMainExercisesByDay(supabase);

  // Unbounded by date (all history) — powers the training calendar's
  // month-grid, which can navigate to any past month client-side without
  // a second round-trip.
  const { data: rawTonnageLogs } = await supabase
    .from("exercise_logs")
    .select("weight_kg, actual_reps, workout_sessions(session_date)")
    .not("weight_kg", "is", null)
    .not("actual_reps", "is", null);

  const dailyTonnageMap = new Map<string, number>();
  for (const log of (rawTonnageLogs ?? []) as unknown as RawTonnageLog[]) {
    const date = log.workout_sessions?.session_date;
    if (!date) continue;
    const tonnage = Number(log.weight_kg) * Number(log.actual_reps);
    dailyTonnageMap.set(date, (dailyTonnageMap.get(date) ?? 0) + tonnage);
  }

  return (
    <WorkoutsListClient
      initialDays={(days ?? []) as PlanDay[]}
      exerciseCounts={Object.fromEntries(countByDay)}
      dailyTonnage={dailyTonnage}
      dailyTonnageByDate={Object.fromEntries(dailyTonnageMap)}
      mainExercisesByDay={mainExercisesByDay}
    />
  );
}

type RawTonnageLog = {
  weight_kg: number;
  actual_reps: number;
  workout_sessions: { session_date: string } | null;
};
