import Link from "next/link";
import Card from "./Card";

type SleepSession = {
  id: string;
  end_time: string;
  total_minutes: number | null;
  deep_minutes: number | null;
  rem_minutes: number | null;
  light_minutes: number | null;
};

function formatMinutes(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function SleepSessionsList({ sessions }: { sessions: SleepSession[] }) {
  if (!sessions.length) return null;
  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-semibold">Sleep</p>
      <div className="flex flex-col gap-3">
        {sessions.map((s) => (
          <Link
            key={s.id}
            href={`/health/sleep/${s.id}`}
            className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 active:opacity-60"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <p className="text-sm font-medium">
                {new Date(s.end_time).toLocaleDateString("en-IE", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Deep {formatMinutes(s.deep_minutes)} · REM {formatMinutes(s.rem_minutes)} · Light{" "}
                {formatMinutes(s.light_minutes)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold tabular-nums">{formatMinutes(s.total_minutes)}</p>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
