import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { PlanDay, PlanExercise } from "@/lib/types";
import WorkoutDayClient from "@/components/WorkoutDayClient";

export const dynamic = "force-dynamic";

export default async function WorkoutDayPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
  const supabase = getSupabaseServerClient();

  const { data: day } = await supabase
    .from("plan_days")
    .select("*")
    .eq("id", dayId)
    .single();

  if (!day) notFound();

  // Grouped into warmup/main/cooldown sections client-side (see
  // WorkoutDayClient) rather than ordered by category here, since
  // alphabetical category order isn't the display order we want.
  const { data: exercises } = await supabase
    .from("plan_exercises")
    .select("*, exercises(*)")
    .eq("plan_day_id", dayId)
    .order("sort_order", { ascending: true });

  return (
    <WorkoutDayClient
      day={day as PlanDay}
      initialExercises={(exercises ?? []) as PlanExercise[]}
    />
  );
}
