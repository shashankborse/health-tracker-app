import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getReadinessForDate } from "@/lib/readiness";
import { decideNextTarget } from "@/lib/progressiveOverload";
import { todayLocalISODate } from "@/lib/date";

function parseFirstNumber(text: string | null, fallback: number): number {
  if (!text) return fallback;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.session_id || !body?.plan_exercise_id || !body?.client_id) {
    return NextResponse.json(
      { error: "session_id, plan_exercise_id, and client_id are required." },
      { status: 400 }
    );
  }
  if (body.rpe !== null && body.rpe !== undefined && (body.rpe < 1 || body.rpe > 10)) {
    return NextResponse.json({ error: "rpe must be between 1 and 10." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("exercise_logs")
    .upsert(
      {
        session_id: body.session_id,
        plan_exercise_id: body.plan_exercise_id,
        client_id: body.client_id,
        set_number: body.set_number ?? 1,
        actual_reps: body.actual_reps ?? null,
        weight_kg: body.weight_kg ?? null,
        rpe: body.rpe ?? null,
        duration_seconds: body.duration_seconds ?? null,
        hold_time_seconds: body.hold_time_seconds ?? null,
      },
      { onConflict: "client_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Personal-record check + progressive overload — both only meaningful
  // for a weighted set (main lifts; reps-only/duration/hold-time entries
  // have no weight_kg). A PR is "heaviest weight_kg ever logged for this
  // exercise" — reps at that weight are stored for context, not as a
  // second, independent PR axis.
  let isNewPr = false;
  let previousBestWeightKg: number | null = null;
  let overloadSuggestion: { decision: string; nextWeightKg: number } | null = null;

  if (body.weight_kg != null && body.actual_reps != null) {
    const [{ data: planExercise }, { data: session }] = await Promise.all([
      supabase.from("plan_exercises").select("exercise_id, target_reps, target_weight_kg").eq("id", body.plan_exercise_id).single(),
      supabase.from("workout_sessions").select("session_date").eq("id", body.session_id).single(),
    ]);

    if (planExercise) {
      const { data: existingPr } = await supabase
        .from("personal_records")
        .select("best_weight_kg")
        .eq("exercise_id", planExercise.exercise_id)
        .maybeSingle();

      const weightNum = Number(body.weight_kg);
      if (!existingPr || weightNum > Number(existingPr.best_weight_kg)) {
        previousBestWeightKg = existingPr?.best_weight_kg != null ? Number(existingPr.best_weight_kg) : null;
        isNewPr = true;
        await supabase.from("personal_records").upsert(
          {
            exercise_id: planExercise.exercise_id,
            best_weight_kg: weightNum,
            best_reps_at_weight: body.actual_reps,
            achieved_date: session?.session_date ?? new Date().toISOString().slice(0, 10),
            previous_best_weight_kg: previousBestWeightKg,
          },
          { onConflict: "exercise_id" }
        );
      }

      // Progressive overload engine (SPEC.md:80) — recomputed from every
      // complete (weight+reps+RPE) set logged for this exercise+session so
      // far, same trigger point as the PR check above. Recomputing on
      // every set is harmless (idempotent overwrite); the session's last
      // set naturally reflects the complete picture.
      if (body.rpe != null) {
        const { data: setsToday } = await supabase
          .from("exercise_logs")
          .select("actual_reps, rpe")
          .eq("session_id", body.session_id)
          .eq("plan_exercise_id", body.plan_exercise_id)
          .not("actual_reps", "is", null)
          .not("rpe", "is", null);

        if (setsToday && setsToday.length > 0) {
          const readiness = await getReadinessForDate(supabase, session?.session_date ?? todayLocalISODate());
          const currentWeightKg =
            planExercise.target_weight_kg != null ? Number(planExercise.target_weight_kg) : weightNum;
          const suggestion = decideNextTarget({
            currentWeightKg,
            targetReps: parseFirstNumber(planExercise.target_reps, 10),
            setsToday: setsToday.map((s) => ({ actualReps: s.actual_reps as number, rpe: s.rpe as number })),
            readinessBand: readiness.band,
          });
          await supabase
            .from("plan_exercises")
            .update({ target_weight_kg: suggestion.nextWeightKg })
            .eq("id", body.plan_exercise_id);
          overloadSuggestion = suggestion;
        }
      }
    }
  }

  return NextResponse.json({ log: data, isNewPr, previousBestWeightKg, overloadSuggestion }, { status: 201 });
}

// Deletes by client_id rather than server id, since a set removed right
// after logging might still only exist in the offline queue, never having
// reached the server to receive a row — client_id is the one identifier
// guaranteed to exist in both cases.
export async function DELETE(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id is required." }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("exercise_logs").delete().eq("client_id", clientId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
