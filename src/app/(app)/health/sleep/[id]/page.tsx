import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { computeSleepQuality, type StageSegment } from "@/lib/sleepQuality";
import Card from "@/components/Card";

export const dynamic = "force-dynamic";

// Single-hue-stepped-opacity for the 3 real sleep depths (per
// DESIGN_REFERENCE.md's documented pattern), Awake gets its own color
// since it isn't a depth level. Only these 4 types are ever actually
// synced (backed by stagesSummary's DEEP/REM/LIGHT/AWAKE aggregates) —
// no speculative ASLEEP/RESTLESS keys.
const STAGE_ORDER = ["AWAKE", "REM", "LIGHT", "DEEP"] as const;
const STAGE_COLORS: Record<string, string> = {
  AWAKE: "var(--warn)",
  REM: "color-mix(in srgb, var(--sleep) 70%, transparent)",
  LIGHT: "color-mix(in srgb, var(--sleep) 40%, transparent)",
  DEEP: "var(--sleep)",
};
const STAGE_LABELS: Record<string, string> = { AWAKE: "Awake", REM: "REM", LIGHT: "Light", DEEP: "Deep" };

function formatMinutes(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IE", { hour: "numeric", minute: "2-digit" });
}

export default async function SleepDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { data: session } = await supabase.from("sleep_sessions").select("*").eq("id", id).maybeSingle();
  if (!session) notFound();

  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  const totalMs = Math.max(end - start, 1);
  const stages: StageSegment[] = session.stages_json ?? [];

  const stageMinutes: Record<string, number | null> = {
    AWAKE: session.awake_minutes,
    REM: session.rem_minutes,
    LIGHT: session.light_minutes,
    DEEP: session.deep_minutes,
  };

  const quality = computeSleepQuality(stages, session.start_time);

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center gap-2 px-1">
        <Link href="/health" aria-label="Back to Health" className="active:opacity-60">
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {new Date(session.end_time).toLocaleDateString("en-IE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h1>
      </div>

      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums">{formatMinutes(session.total_minutes)}</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {formatTime(session.start_time)} – {formatTime(session.end_time)}
          </span>
        </div>

        {stages.length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5">
            {STAGE_ORDER.map((type) => (
              <div key={type}>
                <p className="mb-1 text-xs font-medium" style={{ color: "var(--muted)" }}>
                  {STAGE_LABELS[type]} · {formatMinutes(stageMinutes[type])}
                </p>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-2)" }}>
                  {stages
                    .filter((s) => s.type === type)
                    .map((s, i) => {
                      const segStart = new Date(s.startTime).getTime();
                      const segEnd = new Date(s.endTime).getTime();
                      const leftPct = ((segStart - start) / totalMs) * 100;
                      const widthPct = Math.max(((segEnd - segStart) / totalMs) * 100, 0.6);
                      return (
                        <div
                          key={i}
                          className="absolute top-0 h-full rounded-full"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: STAGE_COLORS[type] }}
                        />
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Sleep quality
        </p>
        <div className="mt-2 flex flex-col">
          <div className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
            <span>Time to fall asleep</span>
            <span className="font-semibold tabular-nums">
              {quality.timeToFallAsleepMinutes != null ? `${quality.timeToFallAsleepMinutes} min` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <span>Awakenings</span>
            <span className="font-semibold tabular-nums">{quality.awakenings}</span>
          </div>
        </div>
      </Card>
    </main>
  );
}
