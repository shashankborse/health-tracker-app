import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getWeeklyTrainingLoad } from "@/lib/trainingLoad";
import Card from "@/components/Card";

export const dynamic = "force-dynamic";

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  glutes: "Glutes",
  core: "Core",
  mobility: "Mobility",
  cardio: "Cardio",
};

function formatShortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

type PersonalRecordRow = {
  best_weight_kg: number;
  best_reps_at_weight: number;
  achieved_date: string;
  previous_best_weight_kg: number | null;
  exercises: { name: string };
};

export default async function TrainingLoadPage() {
  const supabase = getSupabaseServerClient();

  const { muscleGroupVolume, totalKg, muscleGroupWindowDays } = await getWeeklyTrainingLoad(supabase);

  const { data: records } = await supabase
    .from("personal_records")
    .select("best_weight_kg, best_reps_at_weight, achieved_date, previous_best_weight_kg, exercises(name)")
    .order("achieved_date", { ascending: false });
  const personalRecords = (records ?? []) as unknown as PersonalRecordRow[];

  const muscleGroupTotal = muscleGroupVolume.reduce((sum, m) => sum + m.tonnageKg, 0);

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center gap-2 px-1">
        <Link href="/workouts" aria-label="Back to Workouts" className="active:opacity-60">
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Training Load</h1>
      </div>

      <Card className="p-4">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          This week
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {Math.round(totalKg).toLocaleString()}
          <span className="ml-1 text-base font-medium" style={{ color: "var(--muted)" }}>kg</span>
        </p>
      </Card>

      {muscleGroupVolume.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            By body part
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Last {muscleGroupWindowDays} days</p>
          <div className="mt-2 flex flex-col gap-4">
            {muscleGroupVolume.map((m) => {
              const pct = Math.round((m.tonnageKg / muscleGroupTotal) * 100);
              return (
                <div key={m.muscleGroup}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{MUSCLE_GROUP_LABELS[m.muscleGroup] ?? m.muscleGroup}</span>
                    <span className="tabular-nums" style={{ color: "var(--muted)" }}>
                      {Math.round(m.tonnageKg).toLocaleString()}kg ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--muted) 20%, transparent)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: "var(--accent)" }} />
                  </div>
                  <div className="mt-2 flex flex-col gap-1 pl-1">
                    {m.exercises.map((e) => (
                      <div key={e.name} className="flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
                        <span>{e.name}</span>
                        <span className="tabular-nums">{Math.round(e.tonnageKg).toLocaleString()}kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {personalRecords.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Personal Records
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {personalRecords.map((r) => (
              <div key={r.exercises.name} className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.exercises.name}</span>
                <span className="flex items-center gap-2">
                  {r.previous_best_weight_kg != null && (
                    <span className="text-xs tabular-nums" style={{ color: "var(--accent)" }}>
                      +{Math.round((r.best_weight_kg - r.previous_best_weight_kg) * 10) / 10}kg
                    </span>
                  )}
                  <span className="font-semibold tabular-nums">
                    {r.best_weight_kg}kg × {r.best_reps_at_weight}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{formatShortDate(r.achieved_date)}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
