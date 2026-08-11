import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getReadinessForDate } from "@/lib/readiness";
import { decidePhaseChange, RUNNING_PHASES } from "@/lib/runningProgression";
import { todayLocalISODate } from "@/lib/date";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.session_id || !body?.client_id) {
    return NextResponse.json(
      { error: "session_id and client_id are required." },
      { status: 400 }
    );
  }
  if (body.rpe !== null && body.rpe !== undefined && (body.rpe < 1 || body.rpe > 10)) {
    return NextResponse.json({ error: "rpe must be between 1 and 10." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("run_logs")
    .upsert(
      {
        session_id: body.session_id,
        client_id: body.client_id,
        distance_km: body.distance_km ?? null,
        duration_seconds: body.duration_seconds ?? null,
        rpe: body.rpe ?? null,
      },
      { onConflict: "client_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Running progression (SPEC.md:77) — same RPE-advancement + readiness
  // cross-check as the strength overload engine, applied to the running
  // day's phase instead of a weight target.
  let phaseChanged = false;
  let newPhaseNumber: number | null = null;
  if (body.rpe != null) {
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("plan_day_id, session_date")
      .eq("id", body.session_id)
      .single();

    if (session) {
      const { data: planDay } = await supabase
        .from("plan_days")
        .select("running_phase_number")
        .eq("id", session.plan_day_id)
        .single();

      if (planDay) {
        const readiness = await getReadinessForDate(supabase, session.session_date ?? todayLocalISODate());
        const { nextPhase } = decidePhaseChange({
          currentPhase: planDay.running_phase_number,
          rpe: body.rpe,
          readinessBand: readiness.band,
        });

        if (nextPhase !== planDay.running_phase_number) {
          const update: Record<string, unknown> = { running_phase_number: nextPhase };
          if (RUNNING_PHASES[nextPhase]) update.description = RUNNING_PHASES[nextPhase];
          await supabase.from("plan_days").update(update).eq("id", session.plan_day_id);
          phaseChanged = true;
          newPhaseNumber = nextPhase;
        }
      }
    }
  }

  return NextResponse.json({ log: data, phaseChanged, newPhaseNumber }, { status: 201 });
}
