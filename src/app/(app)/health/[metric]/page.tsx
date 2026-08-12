import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import InteractiveTrendChart from "@/components/InteractiveTrendChart";
import { METRIC_DISPLAY, type MetricKey } from "@/lib/metricDisplay";
import Card from "@/components/Card";

export const dynamic = "force-dynamic";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export default async function MetricDetailPage({
  params,
}: {
  params: Promise<{ metric: string }>;
}) {
  const { metric } = await params;
  const config = METRIC_DISPLAY[metric as MetricKey];
  if (!config) notFound();

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from(config.table)
    .select(`entry_date,${config.valueColumn}`)
    .order("entry_date", { ascending: true })
    .limit(365);

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).filter((r) => r[config.valueColumn] != null);
  const points = rows.map((r) => ({ date: r.entry_date as string, value: Number(r[config.valueColumn]) }));
  const values = points.map((p) => p.value);

  const latest = values.length ? values[values.length - 1] : null;
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center gap-2 px-1">
        <Link href="/health" aria-label="Back to Health" className="active:opacity-60">
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{config.label}</h1>
      </div>

      <p className="px-1 text-sm" style={{ color: "var(--muted)" }}>
        {config.description}
      </p>

      <Card className="p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight tabular-nums">
            {latest != null ? `${round1(latest)} ${config.unit}` : "No data yet"}
          </span>
          {points.length > 0 && (
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {new Date(`${points[points.length - 1].date}T00:00:00`).toLocaleDateString("en-IE", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
        {points.length >= 2 ? (
          <InteractiveTrendChart points={points} unit={config.unit} color={config.color} height={200} />
        ) : (
          <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            Not enough data yet.
          </p>
        )}
      </Card>

      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Average" value={round1(avg as number)} unit={config.unit} />
          <StatCard label="Lowest" value={round1(min as number)} unit={config.unit} />
          <StatCard label="Highest" value={round1(max as number)} unit={config.unit} />
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-lg font-bold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {label} ({unit})
      </p>
    </Card>
  );
}
