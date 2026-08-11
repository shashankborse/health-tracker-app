import { getSupabaseServerClient } from "./supabaseServer";

export type ExerciseVolume = { name: string; tonnageKg: number };
export type MuscleGroupVolume = { muscleGroup: string; tonnageKg: number; exercises: ExerciseVolume[] };
export type DailyTonnage = { date: string; tonnageKg: number };

export type WeeklyTrainingLoad = {
  totalKg: number;
  dailyTonnage: DailyTonnage[];
  muscleGroupVolume: MuscleGroupVolume[];
  muscleGroupWindowDays: number;
};

type RawTonnageLog = {
  weight_kg: number;
  actual_reps: number;
  workout_sessions: { session_date: string } | null;
  plan_exercises: { exercises: { name: string; muscle_group: string | null } | null } | null;
};

// Shared by the dashboard's compact Training Load card (just needs
// totalKg) and the /workouts/training-load detail page (needs everything)
// — one query, two callers, kept in one place rather than duplicated.
//
// The body-part breakdown deliberately uses a wider window than the 7-day
// "this week" total: a strict calendar week can land mid-way through a
// multi-day training split and silently drop a body part that was
// genuinely trained just outside it (confirmed live — a chest/back/
// shoulders session 7 days ago was missing entirely from "by body part"
// until this was widened). muscleGroupWindowDays should comfortably cover
// at least one full rotation of the split, not just a literal 7 days.
export async function getWeeklyTrainingLoad(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  muscleGroupWindowDays = 28
): Promise<WeeklyTrainingLoad> {
  const sevenDayStart = new Date();
  sevenDayStart.setUTCDate(sevenDayStart.getUTCDate() - 6);
  const sevenDayStartISO = sevenDayStart.toISOString().slice(0, 10);

  const muscleGroupStart = new Date();
  muscleGroupStart.setUTCDate(muscleGroupStart.getUTCDate() - (muscleGroupWindowDays - 1));
  const muscleGroupStartISO = muscleGroupStart.toISOString().slice(0, 10);

  const { data: rawLogs } = await supabase
    .from("exercise_logs")
    .select("weight_kg, actual_reps, workout_sessions(session_date), plan_exercises(exercises(name, muscle_group))")
    .not("weight_kg", "is", null)
    .not("actual_reps", "is", null);

  const dailyTonnageMap = new Map<string, number>();
  // muscleGroup -> (exerciseName -> tonnageKg)
  const muscleGroupMap = new Map<string, Map<string, number>>();

  for (const log of (rawLogs ?? []) as unknown as RawTonnageLog[]) {
    const date = log.workout_sessions?.session_date;
    if (!date) continue;
    const tonnage = Number(log.weight_kg) * Number(log.actual_reps);

    if (date >= sevenDayStartISO) {
      dailyTonnageMap.set(date, (dailyTonnageMap.get(date) ?? 0) + tonnage);
    }

    if (date >= muscleGroupStartISO) {
      const exercise = log.plan_exercises?.exercises;
      if (exercise?.muscle_group) {
        const byExercise = muscleGroupMap.get(exercise.muscle_group) ?? new Map<string, number>();
        byExercise.set(exercise.name, (byExercise.get(exercise.name) ?? 0) + tonnage);
        muscleGroupMap.set(exercise.muscle_group, byExercise);
      }
    }
  }

  const dailyTonnage: DailyTonnage[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    dailyTonnage.push({ date: iso, tonnageKg: dailyTonnageMap.get(iso) ?? 0 });
  }

  const muscleGroupVolume: MuscleGroupVolume[] = [...muscleGroupMap.entries()]
    .map(([muscleGroup, byExercise]) => ({
      muscleGroup,
      tonnageKg: [...byExercise.values()].reduce((a, b) => a + b, 0),
      exercises: [...byExercise.entries()]
        .map(([name, tonnageKg]) => ({ name, tonnageKg }))
        .sort((a, b) => b.tonnageKg - a.tonnageKg),
    }))
    .sort((a, b) => b.tonnageKg - a.tonnageKg);

  const totalKg = dailyTonnage.reduce((sum, d) => sum + d.tonnageKg, 0);

  return { totalKg, dailyTonnage, muscleGroupVolume, muscleGroupWindowDays };
}
