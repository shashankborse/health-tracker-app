import { getSupabaseServerClient } from "@/lib/supabaseServer";
import DisconnectGoogleHealthButton from "@/components/DisconnectGoogleHealthButton";
import BackfillProgress from "@/components/BackfillProgress";
import MetricTrendCard from "@/components/MetricTrendCard";
import SleepSessionsList from "@/components/SleepSessionsList";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Something went wrong starting the connection. Please try again.",
  no_refresh_token: "Google didn't return a long-lived connection. Try disconnecting access in your Google Account and reconnecting.",
  token_exchange_failed: "Couldn't complete the connection with Google. Please try again.",
  access_denied: "Google Health connection was cancelled.",
};

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = getSupabaseServerClient();
  const { data: connection } = await supabase
    .from("google_health_connection")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

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

  if (connection) {
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

          <MetricTrendCard
            title="Steps"
            unit="steps"
            points={steps.map((s) => ({ date: s.entry_date, value: s.count }))}
            color="#34c759"
          />
          <MetricTrendCard
            title="Resting heart rate"
            unit="bpm"
            points={restingHeartRate.map((r) => ({ date: r.entry_date, value: r.beats_per_minute }))}
            color="#ff3b30"
          />
          <MetricTrendCard
            title="Heart rate variability"
            unit="ms"
            points={hrv
              .filter((h) => h.average_ms != null)
              .map((h) => ({ date: h.entry_date, value: h.average_ms as number }))}
          />
          <MetricTrendCard
            title="Respiratory rate"
            unit="br/min"
            points={respiratoryRate.map((r) => ({ date: r.entry_date, value: r.breaths_per_minute }))}
            color="#ff9500"
          />
          <MetricTrendCard
            title="Blood oxygen (SpO2)"
            unit="%"
            points={spo2.map((s) => ({ date: s.entry_date, value: s.average_pct }))}
            color="#5ac8fa"
          />
          <MetricTrendCard
            title="Skin temperature"
            unit="°C"
            points={skinTemperature.map((t) => ({ date: t.entry_date, value: t.nightly_temperature_c }))}
            color="#af52de"
          />
          <SleepSessionsList sessions={sleepSessions} />
        </>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm">
          <p className="text-base font-semibold">Connect Google Health</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Syncs steps, resting heart rate, HRV, respiratory rate, skin
            temperature, SpO2, sleep stages, and weight from your Fitbit via
            Google Health. Also grants the narrow Drive access needed for
            progress photos, exercise recordings, and database backups.
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
    </main>
  );
}
