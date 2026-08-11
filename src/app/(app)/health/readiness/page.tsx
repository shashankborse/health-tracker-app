import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getReadinessSeries, addDaysISO } from "@/lib/readiness";
import { todayLocalISODate } from "@/lib/date";
import ReadinessDetailClient from "@/components/ReadinessDetailClient";

export const dynamic = "force-dynamic";

export default async function ReadinessDetailPage() {
  const supabase = getSupabaseServerClient();
  const today = todayLocalISODate();
  const series = await getReadinessSeries(supabase, addDaysISO(today, -29), today);

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

      <ReadinessDetailClient series={series} />
    </main>
  );
}
