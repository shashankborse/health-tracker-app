export type WeightEntry = {
  id: string;
  entry_date: string; // YYYY-MM-DD
  weight_kg: number;
  body_fat_pct: number | null;
  note: string | null;
  created_at: string;
};

export type DayType = "strength" | "running" | "active_recovery" | "rest";

export type PlanDay = {
  id: string;
  day_of_week: number;
  name: string;
  day_type: DayType;
  description: string | null;
  sort_order: number;
};

export type Exercise = {
  id: string;
  name: string;
  video_url: string | null;
  instructions: string | null;
};

export type ExerciseCategory = "warmup" | "main" | "cooldown";
export type LogType = "main_lift" | "reps" | "duration" | "hold_time";

export type PlanExercise = {
  id: string;
  plan_day_id: string;
  exercise_id: string;
  category: ExerciseCategory;
  log_type: LogType;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
  target_duration_seconds: number | null;
  notes: string | null;
  exercises: Exercise;
};
