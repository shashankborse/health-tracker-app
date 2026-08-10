import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { PlanDay } from "@/lib/types";
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

  const { data: records } = await supabase
    .from("personal_records")
    .select("best_weight_kg, best_reps_at_weight, achieved_date, previous_best_weight_kg, exercises(name)")
    .order("achieved_date", { ascending: false });

  return (
    <WorkoutsListClient
      initialDays={(days ?? []) as PlanDay[]}
      exerciseCounts={Object.fromEntries(countByDay)}
      personalRecords={(records ?? []) as unknown as PersonalRecordRow[]}
    />
  );
}

export type PersonalRecordRow = {
  best_weight_kg: number;
  best_reps_at_weight: number;
  achieved_date: string;
  previous_best_weight_kg: number | null;
  exercises: { name: string };
};
