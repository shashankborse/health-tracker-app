import type { ReadinessBand } from "./readiness";

export type OverloadDecision = "increase" | "hold" | "reduce";

export type OverloadSuggestion = {
  decision: OverloadDecision;
  nextWeightKg: number;
};

// Default per-session weight step. Not spec'd — a reasonable barbell-plate
// increment, and the field is editable afterward via ExerciseEditForm if
// the user wants a different size for a given exercise.
const WEIGHT_STEP_KG = 2.5;

// SPEC.md:80 — target reps met/exceeded with RPE <=7 -> increase; target
// just met at RPE 8 -> hold; reps missed or RPE >=9 -> hold/reduce
// (resolved here as: missed reps -> reduce, RPE>=9 with reps met -> hold),
// cross-checked against the readiness score.
export function decideNextTarget({
  currentWeightKg,
  targetReps,
  setsToday,
  readinessBand,
}: {
  currentWeightKg: number;
  targetReps: number;
  setsToday: { actualReps: number; rpe: number }[];
  readinessBand: ReadinessBand | null;
}): OverloadSuggestion {
  const allMetTarget = setsToday.every((s) => s.actualReps >= targetReps);
  const worstRpe = Math.max(...setsToday.map((s) => s.rpe));

  let decision: OverloadDecision;
  if (!allMetTarget) {
    decision = "reduce";
  } else if (worstRpe <= 7) {
    decision = readinessBand === "low" ? "hold" : "increase";
  } else {
    // worstRpe is 8 (hold) or >=9 (spec: hold/reduce; reps were met here, so hold)
    decision = "hold";
  }

  const nextWeightKg =
    decision === "increase"
      ? currentWeightKg + WEIGHT_STEP_KG
      : decision === "reduce"
        ? Math.max(0, currentWeightKg - WEIGHT_STEP_KG)
        : currentWeightKg;

  return { decision, nextWeightKg };
}
