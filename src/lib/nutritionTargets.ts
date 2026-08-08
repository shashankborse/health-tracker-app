import { getSupabaseServerClient } from "./supabaseServer";

export type FitnessGoal = "fat_loss" | "maintenance" | "muscle_gain";
export type MealDistribution = "2_meal" | "4_meal";

export type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // true once today's Fitbit-synced calorie burn is available and has
  // superseded the BMR × activity-multiplier estimate, per SPEC.md:83.
  usingSyncedBurn: boolean;
  bmr: number;
  tdee: number;
};

const GOAL_OFFSET_KCAL: Record<FitnessGoal, number> = {
  fat_loss: -350,
  maintenance: 0,
  muscle_gain: 300,
};

function ageFromDob(dob: string): number {
  const birth = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const hadBirthdayThisYear =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() >= birth.getUTCDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

// Returns null when the profile isn't fully filled in yet (height/DOB/sex)
// or no weight has ever been logged — callers should prompt the user to
// finish Goals setup rather than showing a target computed from missing data.
export async function computeDailyTargets(date: string): Promise<NutritionTargets | null> {
  const supabase = getSupabaseServerClient();

  const [{ data: profile }, { data: weightRow }, { data: calorieRow }] = await Promise.all([
    supabase.from("user_profile").select("*").eq("id", "default").maybeSingle(),
    supabase
      .from("weight_entries")
      .select("weight_kg")
      .order("entry_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("daily_total_calories").select("kcal").eq("entry_date", date).maybeSingle(),
  ]);

  if (!profile?.height_cm || !profile?.date_of_birth || !profile?.biological_sex || !weightRow?.weight_kg) {
    return null;
  }

  const weightKg = Number(weightRow.weight_kg);
  const heightCm = Number(profile.height_cm);
  const age = ageFromDob(profile.date_of_birth);
  const sexOffset = profile.biological_sex === "male" ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;

  const usingSyncedBurn = calorieRow?.kcal != null;
  const tdee = usingSyncedBurn ? Number(calorieRow!.kcal) : bmr * Number(profile.activity_multiplier);

  const goal = profile.fitness_goal as FitnessGoal;
  const calories = Math.round(tdee + GOAL_OFFSET_KCAL[goal]);

  const protein = Math.round(weightKg * 2.0);
  const fat = Math.round(weightKg * 0.8);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    calories,
    protein,
    carbs,
    fat,
    usingSyncedBurn,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}
