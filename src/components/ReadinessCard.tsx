import Link from "next/link";
import type { ReadinessResult } from "@/lib/readiness";
import Card from "./Card";
import ProgressRing from "./ProgressRing";
import MiniBar from "./MiniBar";

export const BAND_LABELS: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  optimal: "Optimal",
};
// Same red/yellow/green convention as recovery scores elsewhere (WHOOP-
// style low/medium/high), using the domain tokens so dark mode adapts.
export const BAND_COLORS: Record<string, string> = {
  low: "var(--destructive)",
  moderate: "var(--warn)",
  optimal: "var(--recovery)",
};

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

export default function ReadinessCard({ readiness, href }: { readiness: ReadinessResult; href?: string }) {
  const { score, band, provisional, components } = readiness;

  const card = (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Readiness
        </p>
        {href && (
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        )}
      </div>

      {score == null ? (
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Not enough synced Health data yet to compute a readiness score.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-5">
            <ProgressRing pct={score} size={104} strokeWidth={11} color={BAND_COLORS[band!]}>
              <span className="text-2xl font-bold tabular-nums">{score}</span>
              <span className="text-xs font-semibold" style={{ color: BAND_COLORS[band!] }}>
                {BAND_LABELS[band!]}
              </span>
            </ProgressRing>
            <div className="flex flex-1 flex-col gap-2.5">
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span style={{ color: "var(--muted)" }}>HRV</span>
                  <span className="font-semibold tabular-nums">
                    {components.hrv.value != null ? `${Math.round(components.hrv.value)}ms` : "—"}
                  </span>
                </div>
                <MiniBar pct={components.hrv.subscore ?? 0} color="var(--recovery)" />
              </div>
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span style={{ color: "var(--muted)" }}>Resting HR</span>
                  <span className="font-semibold tabular-nums">
                    {components.rhr.value != null ? `${Math.round(components.rhr.value)}bpm` : "—"}
                  </span>
                </div>
                <MiniBar pct={components.rhr.subscore ?? 0} color="var(--strain)" />
              </div>
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span style={{ color: "var(--muted)" }}>Sleep</span>
                  <span className="font-semibold tabular-nums">
                    {components.sleep.value != null ? formatMinutes(components.sleep.value) : "—"}
                  </span>
                </div>
                <MiniBar pct={components.sleep.subscore ?? 0} color="var(--sleep)" />
              </div>
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span style={{ color: "var(--muted)" }}>Resp. rate</span>
                  <span className="font-semibold tabular-nums">
                    {components.resp.value != null ? `${components.resp.value.toFixed(1)}br/min` : "—"}
                  </span>
                </div>
                <MiniBar pct={components.resp.subscore ?? 0} color="var(--fuel)" />
              </div>
            </div>
          </div>
          {provisional && (
            <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
              Provisional — still building your 30-day baseline.
            </p>
          )}
        </>
      )}
    </Card>
  );

  return href ? (
    <Link href={href} className="active:opacity-70">
      {card}
    </Link>
  ) : (
    card
  );
}
