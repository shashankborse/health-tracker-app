import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import SleepDetailClient from "@/components/SleepDetailClient";
import type { SleepPoint } from "@/components/SleepTrendChart";

export const dynamic = "force-dynamic";

function dateKeyFromTimestamp(ts: string): string {
  const d = new Date(ts);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default async function SleepOverviewPage() {
  const supabase = getSupabaseServerClient();

  const [{ data: sessions }, { data: profile }] = await Promise.all([
    supabase
      .from("sleep_sessions")
      .select("id, end_time, total_minutes")
      .order("end_time", { ascending: false })
      .limit(31),
    // sleep_goal_minutes may not exist yet if the P7-5b migration hasn't
    // been run — this errors gracefully to null rather than crashing the
    // page (Supabase's client returns {data:null,error} for a missing
    // column, it doesn't throw).
    supabase.from("user_profile").select("sleep_goal_minutes").eq("id", "default").maybeSingle(),
  ]);

  const rows = (sessions ?? []) as { id: string; end_time: string; total_minutes: number | null }[];
  const goalMinutes = (profile as { sleep_goal_minutes?: number } | null)?.sleep_goal_minutes ?? null;

  // Bucketed per calendar date (a session can span past midnight) — same
  // convention as readiness.ts's own sleep aggregation.
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (row.total_minutes == null) continue;
    const key = dateKeyFromTimestamp(row.end_time);
    byDate.set(key, (byDate.get(key) ?? 0) + row.total_minutes);
  }

  // Fixed continuous 30-day range (0 for nights with no synced session) —
  // a missing night must still occupy its slot, or the chart's date-
  // proportional x-axis renders with an uneven gap instead of an honest
  // zero point.
  const today = new Date();
  const points: SleepPoint[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: key, minutes: byDate.get(key) ?? 0 };
  });

  const lastNight = rows[0]
    ? { id: rows[0].id, minutes: rows[0].total_minutes ?? 0, endTime: rows[0].end_time }
    : null;

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center gap-2 px-1">
        <Link href="/health" aria-label="Back to Health" className="active:opacity-60">
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Sleep</h1>
      </div>

      <SleepDetailClient points={points} goalMinutes={goalMinutes} lastNight={lastNight} />
    </main>
  );
}
