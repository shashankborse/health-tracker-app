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
  target_weight_kg: number | null;
  target_duration_seconds: number | null;
  notes: string | null;
  exercises: Exercise;
};

export type FoodSource = "cofid" | "restaurant" | "off" | "manual";

// Vitamin/mineral fields are captured (CoFID has the full panel; Open Food
// Facts varies per product; manual entries never set them) but not yet
// surfaced anywhere in the UI — only sugar/saturated fat/sodium are, on
// the daily totals card. Full breakdown display is a future increment.
export type Food = {
  id: string;
  source: FoodSource;
  external_id: string | null;
  name: string;
  brand: string | null;
  serving_description: string | null;
  default_serving_grams: number | null;
  quantity_unit: "g" | "ml";
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fibre_g_per_100g: number | null;
  sugar_g_per_100g: number | null;
  saturated_fat_g_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  potassium_mg_per_100g: number | null;
  calcium_mg_per_100g: number | null;
  magnesium_mg_per_100g: number | null;
  phosphorus_mg_per_100g: number | null;
  iron_mg_per_100g: number | null;
  copper_mg_per_100g: number | null;
  zinc_mg_per_100g: number | null;
  chloride_mg_per_100g: number | null;
  manganese_mg_per_100g: number | null;
  selenium_ug_per_100g: number | null;
  iodine_ug_per_100g: number | null;
  vitamin_a_ug_per_100g: number | null;
  vitamin_d_ug_per_100g: number | null;
  vitamin_e_mg_per_100g: number | null;
  vitamin_k_ug_per_100g: number | null;
  thiamin_mg_per_100g: number | null;
  riboflavin_mg_per_100g: number | null;
  niacin_mg_per_100g: number | null;
  vitamin_b6_mg_per_100g: number | null;
  vitamin_b12_ug_per_100g: number | null;
  folate_ug_per_100g: number | null;
  pantothenate_mg_per_100g: number | null;
  biotin_ug_per_100g: number | null;
  vitamin_c_mg_per_100g: number | null;
  is_favourite: boolean;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodLogEntry = {
  clientId: string;
  id: string | null; // null while only optimistically/queued, not yet server-confirmed
  mealType: MealType;
  quantityAmount: number;
  food: {
    id: string;
    name: string;
    brand: string | null;
    quantityUnit: "g" | "ml";
    caloriesKcalPer100g: number;
    proteinGPer100g: number;
    carbsGPer100g: number;
    fatGPer100g: number;
    fibreGPer100g: number | null;
    sugarGPer100g: number | null;
    saturatedFatGPer100g: number | null;
    sodiumMgPer100g: number | null;
  };
};
