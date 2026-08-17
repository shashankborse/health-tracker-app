import Link from "next/link";
import { todayLocalISODate } from "@/lib/date";
import type { DailyTonnage } from "@/lib/trainingLoad";
import Card from "./Card";

// Apex's own "Weekly load" chart renders empty in production — items-end
// on the bar row collapses every child to content-height, so a
// percentage-height bar has nothing to measure against. We hit the exact
// same bug class once already on this page (see project history) and
// fixed it the same way: give the row a real height and push each bar to
// the bottom with justify-end on the COLUMN, not items-end on the row.
export default function WeeklyLoadChart({ dailyTonnage }: { dailyTonnage: DailyTonnage[] }) {
  const today = todayLocalISODate();
  const max = Math.max(1, ...dailyTonnage.map((d) => d.tonnageKg));
  const avg = dailyTonnage.reduce((sum, d) => sum + d.tonnageKg, 0) / (dailyTonnage.length || 1);

  return (
    <Link href="/workouts/training-load" className="block active:opacity-70">
      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Weekly load
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Avg <span className="font-semibold tabular-nums">{Math.round(avg)}kg</span>
          </p>
        </div>

        <div className="mt-4 flex h-28 justify-between gap-2">
          {dailyTonnage.map((d) => {
            const pct = (d.tonnageKg / max) * 100;
            const isToday = d.date === today;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <div className="flex w-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-full"
                    style={{
                      height: d.tonnageKg > 0 ? `${Math.max(pct, 4)}%` : "2px",
                      backgroundColor: isToday ? "var(--strain)" : "color-mix(in srgb, var(--strain) 45%, transparent)",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: isToday ? "var(--foreground)" : "var(--muted)" }}
                >
                  {new Date(`${d.date}T00:00:00`).toLocaleDateString("en-IE", { weekday: "narrow" })}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </Link>
  );
}
