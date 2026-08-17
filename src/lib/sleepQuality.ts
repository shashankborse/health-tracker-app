export type StageSegment = { startTime: string; endTime: string; type: string };

export type SleepQuality = { timeToFallAsleepMinutes: number | null; awakenings: number };

// Derived from sleep_sessions.stages_json's real per-segment timestamps —
// not Fitbit's own Sound-sleep/Restlessness/Interruptions-vs-typical-range
// metrics, which we have no data to compute. Onset = start of the first
// non-AWAKE segment; awakenings = AWAKE segments strictly between onset
// and the final segment (excludes the pre-sleep and final wake-up spans).
export function computeSleepQuality(stages: StageSegment[], sessionStart: string): SleepQuality {
  if (!stages || stages.length === 0) {
    return { timeToFallAsleepMinutes: null, awakenings: 0 };
  }

  const sorted = [...stages].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const onsetIndex = sorted.findIndex((s) => s.type !== "AWAKE");
  if (onsetIndex < 0) {
    return { timeToFallAsleepMinutes: null, awakenings: 0 };
  }

  const startMs = new Date(sessionStart).getTime();
  const onsetMs = new Date(sorted[onsetIndex].startTime).getTime();
  const timeToFallAsleepMinutes = Math.max(0, Math.round((onsetMs - startMs) / 60000));

  const awakenings = sorted.slice(onsetIndex + 1, sorted.length - 1).filter((s) => s.type === "AWAKE").length;

  return { timeToFallAsleepMinutes, awakenings };
}
