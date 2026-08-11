import type { ReadinessBand } from "./readiness";

// SPEC.md Appendix A, Day 4 — only phases 1 and 2 have real defined text.
// Further phases are explicitly meant to be "added once Phase 2 is
// comfortably sustained, rather than fixed upfront" — this deliberately
// does not fabricate a phase 3+.
export const RUNNING_PHASES: Record<number, string> = {
  1: "Phase 1 (starting point): 20-30 minutes alternating 1 minute jogging with 1 minute walking.",
  2: "Phase 2 (progression target): 30 minutes of continuous, easy-paced running, at a pace where holding a conversation is still possible.",
};

export type PhaseDecision = "advance" | "hold" | "regress";

// SPEC.md:77 — RPE <=7 advance, RPE 8 repeat, RPE >=9 hold/regress,
// cross-checked against readiness (mirrors decideNextTarget in
// progressiveOverload.ts).
export function decidePhaseChange({
  currentPhase,
  rpe,
  readinessBand,
}: {
  currentPhase: number;
  rpe: number;
  readinessBand: ReadinessBand | null;
}): { decision: PhaseDecision; nextPhase: number } {
  let decision: PhaseDecision;
  if (rpe <= 7) {
    decision = readinessBand === "low" ? "hold" : "advance";
  } else if (rpe === 8) {
    decision = "hold";
  } else {
    decision = "regress";
  }

  let nextPhase = currentPhase;
  if (decision === "advance") {
    if (RUNNING_PHASES[currentPhase + 1]) {
      nextPhase = currentPhase + 1;
    } else {
      // No further phase defined yet — hold at the current target rather
      // than fabricating one.
      decision = "hold";
    }
  } else if (decision === "regress") {
    nextPhase = Math.max(1, currentPhase - 1);
  }

  return { decision, nextPhase };
}
