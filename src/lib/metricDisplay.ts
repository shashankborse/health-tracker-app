export type MetricKey =
  | "steps"
  | "resting_heart_rate"
  | "hrv"
  | "respiratory_rate"
  | "spo2"
  | "skin_temperature";

export const METRIC_DISPLAY: Record<
  MetricKey,
  { label: string; unit: string; table: string; valueColumn: string; color: string; description: string }
> = {
  steps: {
    label: "Steps",
    unit: "steps",
    table: "daily_steps",
    valueColumn: "count",
    color: "#34c759",
    description: "Total steps recorded each day via your Fitbit.",
  },
  resting_heart_rate: {
    label: "Resting heart rate",
    unit: "bpm",
    table: "daily_resting_heart_rate",
    valueColumn: "beats_per_minute",
    color: "#ff3b30",
    description: "Your heart rate while at rest — a key indicator of cardiovascular fitness and recovery.",
  },
  hrv: {
    label: "Heart rate variability",
    unit: "ms",
    table: "daily_hrv",
    valueColumn: "average_ms",
    color: "#5e5ce6",
    description: "Variation in time between heartbeats, measured overnight. Higher is generally associated with better recovery.",
  },
  respiratory_rate: {
    label: "Respiratory rate",
    unit: "breaths/min",
    table: "daily_respiratory_rate",
    valueColumn: "breaths_per_minute",
    color: "#ff9500",
    description: "Average breaths per minute during your main sleep period.",
  },
  spo2: {
    label: "Blood oxygen (SpO2)",
    unit: "%",
    table: "daily_spo2",
    valueColumn: "average_pct",
    color: "#5ac8fa",
    description: "Blood oxygen saturation, measured during sleep.",
  },
  skin_temperature: {
    label: "Skin temperature",
    unit: "°C",
    table: "daily_skin_temperature",
    valueColumn: "nightly_temperature_c",
    color: "#af52de",
    description: "Nightly skin temperature relative to your 30-day baseline — deviations can signal illness, cycle changes, or strain.",
  },
};
