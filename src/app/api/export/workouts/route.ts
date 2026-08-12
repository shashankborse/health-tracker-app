import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { rowsToCsv, csvResponse } from "@/lib/csv";

type ExerciseLogRow = {
  set_number: number;
  weight_kg: number | null;
  actual_reps: number | null;
  rpe: number | null;
  duration_seconds: number | null;
  hold_time_seconds: number | null;
  workout_sessions: { session_date: string; plan_days: { name: string } | null } | null;
  plan_exercises: { exercises: { name: string } | null } | null;
};

type RunLogRow = {
  distance_km: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  workout_sessions: { session_date: string; plan_days: { name: string } | null } | null;
};

export async function GET() {
  const supabase = getSupabaseServerClient();

  const [{ data: exerciseLogs }, { data: runLogs }] = await Promise.all([
    supabase
      .from("exercise_logs")
      .select(
        "set_number, weight_kg, actual_reps, rpe, duration_seconds, hold_time_seconds, workout_sessions(session_date, plan_days(name)), plan_exercises(exercises(name))"
      ),
    supabase
      .from("run_logs")
      .select("distance_km, duration_seconds, rpe, workout_sessions(session_date, plan_days(name))"),
  ]);

  type Row = {
    date: string;
    day: string;
    exercise: string;
    set_number: string;
    weight_kg: string;
    reps: string;
    distance_km: string;
    duration_seconds: string;
    hold_time_seconds: string;
    rpe: string;
  };

  const rows: Row[] = [];

  for (const log of (exerciseLogs ?? []) as unknown as ExerciseLogRow[]) {
    rows.push({
      date: log.workout_sessions?.session_date ?? "",
      day: log.workout_sessions?.plan_days?.name ?? "",
      exercise: log.plan_exercises?.exercises?.name ?? "",
      set_number: String(log.set_number ?? ""),
      weight_kg: log.weight_kg?.toString() ?? "",
      reps: log.actual_reps?.toString() ?? "",
      distance_km: "",
      duration_seconds: log.duration_seconds?.toString() ?? "",
      hold_time_seconds: log.hold_time_seconds?.toString() ?? "",
      rpe: log.rpe?.toString() ?? "",
    });
  }

  for (const log of (runLogs ?? []) as unknown as RunLogRow[]) {
    rows.push({
      date: log.workout_sessions?.session_date ?? "",
      day: log.workout_sessions?.plan_days?.name ?? "",
      exercise: "Run",
      set_number: "",
      weight_kg: "",
      reps: "",
      distance_km: log.distance_km?.toString() ?? "",
      duration_seconds: log.duration_seconds?.toString() ?? "",
      hold_time_seconds: "",
      rpe: log.rpe?.toString() ?? "",
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));

  const headers = ["date", "day", "exercise", "set_number", "weight_kg", "reps", "distance_km", "duration_seconds", "hold_time_seconds", "rpe"];
  const csv = rowsToCsv(
    headers,
    rows.map((r) => headers.map((h) => r[h as keyof Row]))
  );
  return csvResponse("workout-history.csv", csv);
}
