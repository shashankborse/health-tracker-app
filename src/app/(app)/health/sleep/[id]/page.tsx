import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import Card from "@/components/Card";

export const dynamic = "force-dynamic";

const STAGE_COLORS: Record<string, string> = {
  DEEP: "#5e5ce6",
  REM: "#5ac8fa",
  LIGHT: "#64d2ff",
  AWAKE: "#ff9500",
  ASLEEP: "var(--accent)",
  RESTLESS: "var(--muted)",
};
const STAGE_LABELS: Record<string, string> = {
  DEEP: "Deep",
  REM: "REM",
  LIGHT: "Light",
  AWAKE: "Awake",
  ASLEEP: "Asleep",
  RESTLESS: "Restless",
};

function formatMinutes(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IE", { hour: "numeric", minute: "2-digit" });
}

type StageSegment = { startTime: string; endTime: string; type: string };

export default async function SleepDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { data: session } = await supabase.from("sleep_sessions").select("*").eq("id", id).maybeSingle();
  if (!session) notFound();

  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  const totalMs = Math.max(end - start, 1);
  const stages: StageSegment[] = session.stages_json ?? [];

  const stageSummary = [
    { type: "DEEP", minutes: session.deep_minutes },
    { type: "REM", minutes: session.rem_minutes },
    { type: "LIGHT", minutes: session.light_minutes },
    { type: "AWAKE", minutes: session.awake_minutes },
  ].filter((s) => s.minutes != null);

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
          <span className="text-2xl font-bold tracking-tight">{formatMinutes(session.total_minutes)}</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {formatTime(session.start_time)} – {formatTime(session.end_time)}
          </span>
        </div>

        {stages.length > 0 && (
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">
            {stages.map((s, i) => {
              const segStart = new Date(s.startTime).getTime();
              const segEnd = new Date(s.endTime).getTime();
              const widthPct = Math.max(((segEnd - segStart) / totalMs) * 100, 0);
              return (
                <div
                  key={i}
                  style={{ width: `${widthPct}%`, backgroundColor: STAGE_COLORS[s.type] ?? "var(--border)" }}
                />
              );
            })}
          </div>
        )}

        {stageSummary.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {stageSummary.map((s) => (
              <div key={s.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[s.type] }} />
                  <span className="text-sm font-medium">{STAGE_LABELS[s.type]}</span>
                </div>
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  {formatMinutes(s.minutes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
