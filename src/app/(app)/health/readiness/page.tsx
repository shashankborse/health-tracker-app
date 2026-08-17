import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getReadinessSeries, addDaysISO } from "@/lib/readiness";
import { todayLocalISODate } from "@/lib/date";
import ReadinessDetailClient from "@/components/ReadinessDetailClient";

export const dynamic = "force-dynamic";

export default async function ReadinessDetailPage() {
  const supabase = getSupabaseServerClient();
  const today = todayLocalISODate();
  const [series, { data: spo2Row }, { data: tempRow }] = await Promise.all([
    getReadinessSeries(supabase, addDaysISO(today, -29), today),
    supabase.from("daily_spo2").select("average_pct").eq("entry_date", today).maybeSingle(),
    supabase.from("daily_skin_temperature").select("nightly_temperature_c").eq("entry_date", today).maybeSingle(),
  ]);

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center gap-2 px-1">
        <Link href="/health" aria-label="Back to Health" className="active:opacity-60">
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Readiness</h1>
      </div>

      <ReadinessDetailClient series={series} spo2Today={spo2Row?.average_pct ?? null} skinTempToday={tempRow?.nightly_temperature_c ?? null} />
    </main>
  );
}
