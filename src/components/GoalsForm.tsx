"use client";

import { useEffect, useState } from "react";
import Card from "./Card";

const ACTIVITY_OPTIONS = [
  { value: 1.2, label: "Sedentary", hint: "Desk job, little exercise" },
  { value: 1.375, label: "Lightly active", hint: "1-3 workouts/week" },
  { value: 1.55, label: "Moderately active", hint: "3-5 workouts/week" },
  { value: 1.725, label: "Very active", hint: "6-7 workouts/week" },
  { value: 1.9, label: "Athlete", hint: "2x daily training" },
];

const GOAL_OPTIONS = [
  { value: "fat_loss", label: "Fat loss" },
  { value: "maintenance", label: "Maintenance" },
  { value: "muscle_gain", label: "Muscle gain" },
] as const;

const MEAL_DIST_OPTIONS = [
  { value: "2_meal", label: "2 meals/day" },
  { value: "4_meal", label: "Standard 4 meals" },
] as const;

type Profile = {
  height_cm: number | null;
  date_of_birth: string | null;
  biological_sex: "male" | "female" | null;
  activity_multiplier: number;
  fitness_goal: "fat_loss" | "maintenance" | "muscle_gain";
  meal_distribution: "2_meal" | "4_meal";
  sleep_goal_minutes: number | null;
};

const SEGMENTED_BUTTON = "flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-center";

function segmentedStyle(active: boolean): React.CSSProperties {
  return active
    ? { backgroundColor: "var(--accent)", color: "white" }
    : { backgroundColor: "color-mix(in srgb, var(--muted) 12%, transparent)", color: "var(--foreground)" };
}

export default function GoalsForm({ onSaved }: { onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [heightCm, setHeightCm] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"male" | "female" | null>(null);
  const [activityMultiplier, setActivityMultiplier] = useState(1.375);
  const [fitnessGoal, setFitnessGoal] = useState<Profile["fitness_goal"]>("maintenance");
  const [mealDistribution, setMealDistribution] = useState<Profile["meal_distribution"]>("4_meal");
  const [sleepGoalHours, setSleepGoalHours] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((body) => {
        const p = body.profile as Profile | null;
        if (p) {
          setHeightCm(p.height_cm != null ? String(p.height_cm) : "");
          setDob(p.date_of_birth ?? "");
          setSex(p.biological_sex);
          setActivityMultiplier(p.activity_multiplier);
          setFitnessGoal(p.fitness_goal);
          setMealDistribution(p.meal_distribution);
          setSleepGoalHours(p.sleep_goal_minutes != null ? String(p.sleep_goal_minutes / 60) : "");
        }
        // Prompt to complete setup automatically if it's genuinely incomplete.
        if (!p?.height_cm || !p?.date_of_birth || !p?.biological_sex) setExpanded(true);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        height_cm: heightCm,
        date_of_birth: dob,
        biological_sex: sex,
        activity_multiplier: activityMultiplier,
        fitness_goal: fitnessGoal,
        meal_distribution: mealDistribution,
        sleep_goal_minutes: sleepGoalHours ? Math.round(Number(sleepGoalHours) * 60) : null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong.");
      return;
    }

    setExpanded(false);
    onSaved();
  }

  if (loading) return null;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-between rounded-[1.375rem] bg-card p-4 text-left card-shadow"
      >
        <span className="text-sm font-semibold">Goals & profile</span>
        <span className="text-sm" style={{ color: "var(--accent)" }}>
          Edit ›
        </span>
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <p className="text-sm font-semibold">Goals & profile</p>

      {error && (
        <p
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={{ backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Height (cm)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-base outline-none"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Date of birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-base outline-none"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Sex</label>
        <div className="mt-1 flex gap-2">
          {(["male", "female"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setSex(v)}
              className={SEGMENTED_BUTTON}
              style={segmentedStyle(sex === v)}
            >
              {v === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Activity level</label>
        <div className="mt-1 flex flex-col gap-1.5">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActivityMultiplier(opt.value)}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm"
              style={segmentedStyle(activityMultiplier === opt.value)}
            >
              <span className="font-medium">{opt.label}</span>
              <span
                className="text-xs"
                style={{ color: activityMultiplier === opt.value ? "white" : "var(--muted)" }}
              >
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Fitness goal</label>
        <div className="mt-1 flex gap-2">
          {GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFitnessGoal(opt.value)}
              className={SEGMENTED_BUTTON}
              style={segmentedStyle(fitnessGoal === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Meal distribution</label>
        <div className="mt-1 flex gap-2">
          {MEAL_DIST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMealDistribution(opt.value)}
              className={SEGMENTED_BUTTON}
              style={segmentedStyle(mealDistribution === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Sleep goal (hours)</label>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          placeholder="e.g. 8"
          value={sleepGoalHours}
          onChange={(e) => setSleepGoalHours(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-base outline-none"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      <div className="mt-1 flex gap-2">
        <button
          onClick={() => setExpanded(false)}
          className="flex-1 rounded-xl py-2.5 text-base font-medium"
          style={{ color: "var(--accent)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !heightCm || !dob || !sex}
          className="flex-1 rounded-[14px] py-2.5 text-base font-semibold text-white active:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Card>
  );
}
