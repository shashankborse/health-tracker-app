import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { PlanDay, PlanExercise } from "@/lib/types";
import LiveSessionClient from "@/components/LiveSessionClient";

export const dynamic = "force-dynamic";

// Scoped to main_lift exercises only — the live-session pattern (timer,
// all sets visible at once, checkmark-to-confirm) is for structured
// weight training; warm-up/cool-down stretches stay on the existing
// lightweight per-card flow, which already suits a single-tap log.
export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
  const supabase = getSupabaseServerClient();

  const { data: day } = await supabase.from("plan_days").select("*").eq("id", dayId).single();
  if (!day) notFound();

  const { data: exercises } = await supabase
    .from("plan_exercises")
    .select("*, exercises(*)")
    .eq("plan_day_id", dayId)
    .eq("log_type", "main_lift")
    .order("sort_order", { ascending: true });

  return <LiveSessionClient day={day as PlanDay} exercises={(exercises ?? []) as PlanExercise[]} />;
}
