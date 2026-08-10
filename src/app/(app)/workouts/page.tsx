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

  // Weekly training load — pure aggregation over already-logged sets, no
  // new log table. Only weighted sets (weight_kg + actual_reps both set)
  // contribute; a display/trend window, so a plain server "now" is fine
  // here (unlike logging actions, which must use the client's local day).
  const { data: rawTonnageLogs } = await supabase
    .from("exercise_logs")
    .select("weight_kg, actual_reps, workout_sessions(session_date), plan_exercises(exercises(muscle_group))")
    .not("weight_kg", "is", null)
    .not("actual_reps", "is", null);

  const windowStartDate = new Date();
  windowStartDate.setUTCDate(windowStartDate.getUTCDate() - 6); // 7-day window incl. today
  const windowStart = windowStartDate.toISOString().slice(0, 10);

  const dailyTonnageMap = new Map<string, number>();
  const muscleGroupMap = new Map<string, number>();
  for (const log of (rawTonnageLogs ?? []) as unknown as RawTonnageLog[]) {
    const date = log.workout_sessions?.session_date;
    if (!date || date < windowStart) continue;
    const tonnage = Number(log.weight_kg) * Number(log.actual_reps);
    dailyTonnageMap.set(date, (dailyTonnageMap.get(date) ?? 0) + tonnage);
    const muscleGroup = log.plan_exercises?.exercises?.muscle_group;
    if (muscleGroup) muscleGroupMap.set(muscleGroup, (muscleGroupMap.get(muscleGroup) ?? 0) + tonnage);
  }

  const dailyTonnage: { date: string; tonnageKg: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    dailyTonnage.push({ date: iso, tonnageKg: dailyTonnageMap.get(iso) ?? 0 });
  }
  const muscleGroupVolume = [...muscleGroupMap.entries()]
    .map(([muscleGroup, tonnageKg]) => ({ muscleGroup, tonnageKg }))
    .sort((a, b) => b.tonnageKg - a.tonnageKg);

  return (
    <WorkoutsListClient
      initialDays={(days ?? []) as PlanDay[]}
      exerciseCounts={Object.fromEntries(countByDay)}
      personalRecords={(records ?? []) as unknown as PersonalRecordRow[]}
      dailyTonnage={dailyTonnage}
      muscleGroupVolume={muscleGroupVolume}
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

type RawTonnageLog = {
  weight_kg: number;
  actual_reps: number;
  workout_sessions: { session_date: string } | null;
  plan_exercises: { exercises: { muscle_group: string | null } | null } | null;
};
