import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { WeightEntry } from "@/lib/types";
import WeightChart from "@/components/WeightChart";
import WeightEntryForm from "@/components/WeightEntryForm";
import EnableRemindersCard from "@/components/EnableRemindersCard";
import Card from "@/components/Card";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function WeightPage() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .select("*")
    .order("entry_date", { ascending: false });

  const entries = (data ?? []) as WeightEntry[];
  const chronological = [...entries].reverse();

  return (
    <main className="flex flex-col gap-6 px-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight px-1">Weight</h1>

      {error && (
        <p className="rounded-[1.375rem] bg-card p-4 text-sm card-shadow" style={{ color: "var(--danger)" }}>
          Couldn&apos;t load entries: {error.message}
        </p>
      )}

      <WeightChart entries={chronological} />

      <EnableRemindersCard />

      <Link
        href="/weight/measurements"
        className="flex items-center justify-between rounded-[1.375rem] bg-card p-4 card-shadow active:opacity-70"
      >
        <div>
          <p className="text-base font-semibold">Weekly Measurements</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Body measurements and progress photos.
          </p>
        </div>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>

      <WeightEntryForm />

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          History
        </h2>
        {entries.length === 0 ? (
          <Card className="p-4 text-sm" style={{ color: "var(--muted)" }}>
            No entries yet.
          </Card>
        ) : (
          <Card>
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-3"
                style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
              >
                <div>
                  <p className="text-base font-medium">{formatDate(entry.entry_date)}</p>
                  {entry.note && (
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {entry.note}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold tabular-nums">{entry.weight_kg.toFixed(1)} kg</p>
                  {entry.body_fat_pct !== null && (
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {entry.body_fat_pct.toFixed(1)}% BF
                    </p>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </main>
  );
}
