import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getReadinessForDate, getReadinessSeries, addDaysISO } from "@/lib/readiness";
import { todayLocalISODate } from "@/lib/date";
import DisconnectGoogleHealthButton from "@/components/DisconnectGoogleHealthButton";
import DisconnectGoogleDriveButton from "@/components/DisconnectGoogleDriveButton";
import BackfillProgress from "@/components/BackfillProgress";
import MetricTrendCard from "@/components/MetricTrendCard";
import SleepSessionsList from "@/components/SleepSessionsList";
import ReadinessCard from "@/components/ReadinessCard";
import SleepReadinessScatter, { type SleepReadinessPoint } from "@/components/SleepReadinessScatter";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Something went wrong starting the connection. Please try again.",
  no_refresh_token: "Google didn't return a long-lived connection. Try disconnecting access in your Google Account and reconnecting.",
  token_exchange_failed: "Couldn't complete the connection with Google. Please try again.",
  access_denied: "Google Health connection was cancelled.",
};

const DRIVE_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Something went wrong starting the connection. Please try again.",
  no_refresh_token: "Google didn't return a long-lived connection. Try disconnecting access in your Google Account and reconnecting.",
  token_exchange_failed: "Couldn't complete the connection with Google. Please try again.",
  access_denied: "Google Drive connection was cancelled.",
};

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; drive_connected?: string; drive_error?: string }>;
}) {
  const params = await searchParams;
  const supabase = getSupabaseServerClient();
  const [{ data: connection }, { data: driveConnection }] = await Promise.all([
    supabase.from("google_health_connection").select("*").eq("id", "default").maybeSingle(),
    supabase.from("google_drive_connection").select("*").eq("id", "default").maybeSingle(),
  ]);

  let steps: { entry_date: string; count: number }[] = [];
  let restingHeartRate: { entry_date: string; beats_per_minute: number }[] = [];
  let hrv: { entry_date: string; average_ms: number | null }[] = [];
  let respiratoryRate: { entry_date: string; breaths_per_minute: number }[] = [];
  let spo2: { entry_date: string; average_pct: number }[] = [];
  let skinTemperature: { entry_date: string; nightly_temperature_c: number }[] = [];
  let sleepSessions: {
    id: string;
    end_time: string;
    total_minutes: number | null;
    deep_minutes: number | null;
    rem_minutes: number | null;
    light_minutes: number | null;
  }[] = [];

  let readiness = null as Awaited<ReturnType<typeof getReadinessForDate>> | null;
  const sleepReadinessPoints: SleepReadinessPoint[] = [];

  if (connection) {
    const today = todayLocalISODate();
    readiness = await getReadinessForDate(supabase, today);

    // 60-day window gives enough (sleep, next-day score) pairs to be a
    // meaningful scatter without an expensive query — reuses the same
    // series fetch that powers the readiness detail page's Month view.
    const series = await getReadinessSeries(supabase, addDaysISO(today, -60), today);
    for (let i = 0; i < series.length - 1; i++) {
      const sleepMinutes = series[i].components.sleep.value;
      const nextDayScore = series[i + 1].score;
      if (sleepMinutes != null && nextDayScore != null) {
        sleepReadinessPoints.push({ date: series[i].date, sleepMinutes, readinessScore: nextDayScore });
      }
    }

    const [stepsRes, hrRes, hrvRes, respRes, spo2Res, tempRes, sleepRes] = await Promise.all([
      supabase.from("daily_steps").select("entry_date,count").order("entry_date", { ascending: true }).limit(120),
      supabase
        .from("daily_resting_heart_rate")
        .select("entry_date,beats_per_minute")
        .order("entry_date", { ascending: true })
        .limit(120),
      supabase.from("daily_hrv").select("entry_date,average_ms").order("entry_date", { ascending: true }).limit(120),
      supabase
        .from("daily_respiratory_rate")
        .select("entry_date,breaths_per_minute")
        .order("entry_date", { ascending: true })
        .limit(120),
      supabase.from("daily_spo2").select("entry_date,average_pct").order("entry_date", { ascending: true }).limit(120),
      supabase
        .from("daily_skin_temperature")
        .select("entry_date,nightly_temperature_c")
        .order("entry_date", { ascending: true })
        .limit(120),
      supabase
        .from("sleep_sessions")
        .select("id,end_time,total_minutes,deep_minutes,rem_minutes,light_minutes")
        .order("end_time", { ascending: false })
        .limit(7),
    ]);
    steps = stepsRes.data ?? [];
    restingHeartRate = hrRes.data ?? [];
    hrv = hrvRes.data ?? [];
    respiratoryRate = respRes.data ?? [];
    spo2 = spo2Res.data ?? [];
    skinTemperature = tempRes.data ?? [];
    sleepSessions = sleepRes.data ?? [];
  }

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight px-1">Health</h1>

      {params.connected && (
        <div
          className="rounded-2xl p-4 text-sm font-medium shadow-sm"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
        >
          Connected to Google Health.
        </div>
      )}
      {params.error && (
        <div
          className="rounded-2xl p-4 text-sm font-medium shadow-sm"
          style={{ backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
        >
          {ERROR_MESSAGES[params.error] ?? "Something went wrong."}
        </div>
      )}
      {params.drive_connected && (
        <div
          className="rounded-2xl p-4 text-sm font-medium shadow-sm"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
        >
          Connected to Google Drive.
        </div>
      )}
      {params.drive_error && (
        <div
          className="rounded-2xl p-4 text-sm font-medium shadow-sm"
          style={{ backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
        >
          {DRIVE_ERROR_MESSAGES[params.drive_error] ?? "Something went wrong."}
        </div>
      )}

      {connection ? (
        <>
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">Connected</p>
              <DisconnectGoogleHealthButton />
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Since {new Date(connection.connected_at).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <BackfillProgress initialStatus={connection.backfill_status} />

          {readiness && <ReadinessCard readiness={readiness} href="/health/readiness" />}

          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Sleep vs. Next-Day Readiness
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Last 60 days</p>
            <div className="mt-2">
              <SleepReadinessScatter points={sleepReadinessPoints} />
            </div>
          </div>

          <MetricTrendCard
            title="Steps"
            unit="steps"
            points={steps.map((s) => ({ date: s.entry_date, value: s.count }))}
            color="#34c759"
            href="/health/steps"
          />
          <MetricTrendCard
            title="Resting heart rate"
            unit="bpm"
            points={restingHeartRate.map((r) => ({ date: r.entry_date, value: r.beats_per_minute }))}
            color="#ff3b30"
            href="/health/resting_heart_rate"
          />
          <MetricTrendCard
            title="Heart rate variability"
            unit="ms"
            points={hrv
              .filter((h) => h.average_ms != null)
              .map((h) => ({ date: h.entry_date, value: h.average_ms as number }))}
            href="/health/hrv"
          />
          <MetricTrendCard
            title="Respiratory rate"
            unit="br/min"
            points={respiratoryRate.map((r) => ({ date: r.entry_date, value: r.breaths_per_minute }))}
            color="#ff9500"
            href="/health/respiratory_rate"
          />
          <MetricTrendCard
            title="Blood oxygen (SpO2)"
            unit="%"
            points={spo2.map((s) => ({ date: s.entry_date, value: s.average_pct }))}
            color="#5ac8fa"
            href="/health/spo2"
          />
          <MetricTrendCard
            title="Skin temperature"
            unit="°C"
            points={skinTemperature.map((t) => ({ date: t.entry_date, value: t.nightly_temperature_c }))}
            color="#af52de"
            href="/health/skin_temperature"
          />
          <SleepSessionsList sessions={sleepSessions} />
        </>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm">
          <p className="text-base font-semibold">Connect Google Health</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Syncs steps, resting heart rate, HRV, respiratory rate, skin
            temperature, SpO2, sleep stages, and weight from your Fitbit via
            Google Health.
          </p>
          <a
            href="/api/google-health/connect"
            className="mt-1 rounded-xl py-3 text-center text-base font-semibold text-white active:opacity-80"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Connect Google Health
          </a>
        </div>
      )}

      {driveConnection ? (
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Google Drive Connected</p>
            <DisconnectGoogleDriveButton />
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Since{" "}
            {new Date(driveConnection.connected_at).toLocaleDateString("en-IE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm">
          <p className="text-base font-semibold">Connect Google Drive</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Needed for progress photos, exercise recordings, and database
            backups — a separate, narrow connection (this app can only see
            files it creates itself) from Google Health above.
          </p>
          <a
            href="/api/google-drive/connect"
            className="mt-1 rounded-xl py-3 text-center text-base font-semibold text-white active:opacity-80"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Connect Google Drive
          </a>
        </div>
      )}
    </main>
  );
}
