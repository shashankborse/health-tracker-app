import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getReadinessForDate, addDaysISO, type ReadinessBand } from "@/lib/readiness";
import { getWeeklyTrainingLoad } from "@/lib/trainingLoad";
import { todayLocalISODate } from "@/lib/date";
import type { PlanDay } from "@/lib/types";
import { BAND_COLORS, formatMinutes } from "@/components/ReadinessCard";
import Card from "@/components/Card";
import ProgressRing from "@/components/ProgressRing";
import MiniBar from "@/components/MiniBar";
import HomeFuelingSummary from "@/components/HomeFuelingSummary";
import TodaysSessionCard, { type MainExerciseRow } from "@/components/TodaysSessionCard";

export const dynamic = "force-dynamic";

const INSIGHT_BY_BAND: Record<ReadinessBand, string> = {
  optimal: "You're well recovered — a good day to push training intensity.",
  moderate: "Recovery is moderate today — keep training in your normal range.",
  low: "Recovery is low today — consider an easier session or extra rest.",
};

type SleepStage = { label: string; minutes: number; opacity: number };

type ExerciseLogRow = {
  session_id: string;
  weight_kg: number | null;
  actual_reps: number | null;
  workout_sessions: { session_date: string; plan_days: { name: string } | null } | null;
};

type RunLogRow = {
  session_id: string;
  distance_km: number | null;
  duration_seconds: number | null;
  workout_sessions: { session_date: string; plan_days: { name: string } | null } | null;
};

type Activity =
  | { sessionId: string; kind: "strength"; date: string; name: string; sets: number; tonnageKg: number }
  | { sessionId: string; kind: "run"; date: string; name: string; distanceKm: number | null; durationSeconds: number | null };

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatActivityDate(dateStr: string, today: string): string {
  if (dateStr === today) return "Today";
  if (dateStr === addDaysISO(today, -1)) return "Yesterday";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IE", { weekday: "long" });
}

export default async function Home() {
  const supabase = getSupabaseServerClient();
  const today = todayLocalISODate();

  const { data: connection } = await supabase
    .from("google_health_connection")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  let readiness = null as Awaited<ReturnType<typeof getReadinessForDate>> | null;
  let weeklyTonnageKg = 0;
  let spo2Today: number | null = null;
  let sleepStages: SleepStage[] = [];

  if (connection) {
    [readiness, { totalKg: weeklyTonnageKg }] = await Promise.all([
      getReadinessForDate(supabase, today),
      getWeeklyTrainingLoad(supabase),
    ]);

    const [{ data: spo2Row }, { data: latestSleep }] = await Promise.all([
      supabase.from("daily_spo2").select("average_pct").eq("entry_date", today).maybeSingle(),
      supabase
        .from("sleep_sessions")
        .select("total_minutes, deep_minutes, rem_minutes, light_minutes")
        .order("end_time", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    spo2Today = spo2Row?.average_pct ?? null;

    if (latestSleep?.total_minutes) {
      sleepStages = [
        { label: "Light", minutes: latestSleep.light_minutes ?? 0, opacity: 0.4 },
        { label: "REM", minutes: latestSleep.rem_minutes ?? 0, opacity: 0.7 },
        { label: "Deep", minutes: latestSleep.deep_minutes ?? 0, opacity: 1 },
      ];
    }
  }

  const [{ data: days }, { data: mainExercises }, { data: exerciseLogs }, { data: runLogs }] = await Promise.all([
    supabase.from("plan_days").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("plan_exercises")
      .select("plan_day_id, target_sets, target_reps, target_weight_kg, exercises(name)")
      .eq("category", "main")
      .order("sort_order", { ascending: true }),
    supabase
      .from("exercise_logs")
      .select("session_id, weight_kg, actual_reps, workout_sessions(session_date, plan_days(name))")
      .not("weight_kg", "is", null)
      .not("actual_reps", "is", null),
    supabase
      .from("run_logs")
      .select("session_id, distance_km, duration_seconds, workout_sessions(session_date, plan_days(name))"),
  ]);

  const mainExercisesByDay: Record<string, MainExerciseRow[]> = {};
  for (const row of (mainExercises ?? []) as unknown as (MainExerciseRow & { plan_day_id: string })[]) {
    (mainExercisesByDay[row.plan_day_id] ??= []).push(row);
  }

  const strengthBySession = new Map<string, { date: string; name: string; sets: number; tonnageKg: number }>();
  for (const log of (exerciseLogs ?? []) as unknown as ExerciseLogRow[]) {
    const date = log.workout_sessions?.session_date;
    if (!date) continue;
    const existing = strengthBySession.get(log.session_id) ?? {
      date,
      name: log.workout_sessions?.plan_days?.name ?? "Workout",
      sets: 0,
      tonnageKg: 0,
    };
    existing.sets += 1;
    existing.tonnageKg += Number(log.weight_kg) * Number(log.actual_reps);
    strengthBySession.set(log.session_id, existing);
  }

  const activity: Activity[] = [
    ...[...strengthBySession.entries()].map(([sessionId, v]) => ({ sessionId, kind: "strength" as const, ...v })),
    ...((runLogs ?? []) as unknown as RunLogRow[])
      .filter((log) => log.workout_sessions?.session_date)
      .map((log) => ({
        sessionId: log.session_id,
        kind: "run" as const,
        date: log.workout_sessions!.session_date,
        name: log.workout_sessions?.plan_days?.name ?? "Run",
        distanceKm: log.distance_km,
        durationSeconds: log.duration_seconds,
      })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  const dateCaption = new Date(`${today}T00:00:00`).toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-start justify-between px-1">
        <p className="text-sm" style={{ color: "var(--muted)" }}>{dateCaption}</p>
        {readiness?.score != null && readiness.band && (
          <Link href="/health/readiness" className="active:opacity-70">
            <ProgressRing pct={readiness.score} size={44} strokeWidth={5} color={BAND_COLORS[readiness.band]}>
              <span className="text-sm font-bold tabular-nums">{readiness.score}</span>
            </ProgressRing>
          </Link>
        )}
      </div>
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.035em]">{greeting}, Shashank</h1>
        <form action="/api/logout" method="POST">
          <button type="submit" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
            Log out
          </button>
        </form>
      </div>

      {connection ? (
        <>
          <Card className="p-4 animate-enter">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Recovery
              </p>
              <Link href="/health/readiness" className="text-sm font-medium" style={{ color: "var(--recovery)" }}>
                Details ›
              </Link>
            </div>

            {readiness?.score == null ? (
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                Not enough synced Health data yet to compute a readiness score.
              </p>
            ) : (
              <div className="mt-3 flex items-center gap-5">
                <ProgressRing pct={readiness.score} size={128} strokeWidth={14} color={BAND_COLORS[readiness.band!]}>
                  <span className="text-3xl font-bold tabular-nums">{readiness.score}</span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>percent</span>
                </ProgressRing>
                <div className="flex flex-1 flex-col gap-2.5">
                  <div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span style={{ color: "var(--muted)" }}>HRV</span>
                      <span className="font-semibold tabular-nums">
                        {readiness.components.hrv.value != null ? `${Math.round(readiness.components.hrv.value)} ms` : "—"}
                      </span>
                    </div>
                    <MiniBar pct={readiness.components.hrv.subscore ?? 0} color="var(--recovery)" />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span style={{ color: "var(--muted)" }}>RHR</span>
                      <span className="font-semibold tabular-nums">
                        {readiness.components.rhr.value != null ? `${Math.round(readiness.components.rhr.value)} bpm` : "—"}
                      </span>
                    </div>
                    <MiniBar pct={readiness.components.rhr.subscore ?? 0} color="var(--strain)" />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span style={{ color: "var(--muted)" }}>SpO₂</span>
                      <span className="font-semibold tabular-nums">{spo2Today != null ? `${spo2Today}%` : "—"}</span>
                    </div>
                    <MiniBar pct={spo2Today ?? 0} color="var(--sleep)" />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span style={{ color: "var(--muted)" }}>Resp</span>
                      <span className="font-semibold tabular-nums">
                        {readiness.components.resp.value != null ? `${readiness.components.resp.value.toFixed(1)} rpm` : "—"}
                      </span>
                    </div>
                    <MiniBar pct={readiness.components.resp.subscore ?? 0} color="var(--fuel)" />
                  </div>
                </div>
              </div>
            )}

            {readiness?.band && (
              <>
                <div className="my-3 border-t" style={{ borderColor: "var(--border)" }} />
                <p className="text-sm" style={{ color: "var(--muted)" }}>{INSIGHT_BY_BAND[readiness.band]}</p>
              </>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 animate-enter" style={{ animationDelay: "40ms" }}>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Load</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {Math.round(weeklyTonnageKg).toLocaleString()}
                <span className="ml-1 text-base font-medium" style={{ color: "var(--muted)" }}>kg</span>
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>This week</p>
            </Card>
            <Card className="p-4 animate-enter" style={{ animationDelay: "40ms" }}>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Sleep</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {readiness?.components.sleep.value != null ? formatMinutes(readiness.components.sleep.value) : "—"}
              </p>
              {sleepStages.length > 0 && (
                <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-2)" }}>
                  {sleepStages.map((s) => {
                    const total = sleepStages.reduce((sum, x) => sum + x.minutes, 0) || 1;
                    return (
                      <div
                        key={s.label}
                        style={{
                          width: `${(s.minutes / total) * 100}%`,
                          backgroundColor: `color-mix(in srgb, var(--sleep) ${s.opacity * 100}%, transparent)`,
                        }}
                      />
                    );
                  })}
                </div>
              )}
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                {readiness?.components.sleep.subscore != null ? `Score ${Math.round(readiness.components.sleep.subscore)}` : "No score yet"}
              </p>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-4 animate-enter">
          <p className="text-sm font-semibold">Connect Google Health</p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Recovery, load, and sleep need synced Health data.
          </p>
          <Link href="/health" className="mt-2 inline-block text-sm font-medium" style={{ color: "var(--accent)" }}>
            Go to Health ›
          </Link>
        </Card>
      )}

      <HomeFuelingSummary />

      <TodaysSessionCard days={(days ?? []) as PlanDay[]} mainExercisesByDay={mainExercisesByDay} />

      {activity.length > 0 && (
        <Card className="p-4 animate-enter">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Recent activity
          </p>
          <div className="mt-2 flex flex-col">
            {activity.map((a) => (
              <div key={a.sessionId} className="flex items-center gap-3 py-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  style={{ backgroundColor: "var(--surface-2)", color: "var(--muted-foreground)" }}
                >
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {a.kind === "strength"
                      ? `${a.sets} sets · ${Math.round(a.tonnageKg)}kg`
                      : `${a.distanceKm ?? "—"}km · ${formatDuration(a.durationSeconds)}`}
                  </p>
                </div>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{formatActivityDate(a.date, today)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Link
        href="/export"
        className="flex items-center gap-4 rounded-[1.375rem] bg-card p-4 card-shadow active:opacity-70 animate-enter"
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
        >
          <svg
            viewBox="0 0 24 24"
            width={22}
            height={22}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 4v10m0 0-3.5-3.5M12 14l3.5-3.5M6 18h12" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-base font-semibold">Export Data</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Download your weight, workout, and nutrition history as CSV.
          </p>
        </div>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </main>
  );
}
