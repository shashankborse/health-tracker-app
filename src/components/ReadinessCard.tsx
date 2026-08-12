import Link from "next/link";
import type { ReadinessResult } from "@/lib/readiness";
import Card from "./Card";

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
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{score}</span>
            <span className="text-sm font-semibold" style={{ color: band ? BAND_COLORS[band] : "var(--muted)" }}>
              {band ? BAND_LABELS[band] : ""}
            </span>
          </div>
          {provisional && (
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              Provisional — still building your 30-day baseline.
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>HRV</p>
              <p className="text-sm font-semibold tabular-nums">
                {components.hrv.value != null ? `${Math.round(components.hrv.value)}ms` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Resting HR</p>
              <p className="text-sm font-semibold tabular-nums">
                {components.rhr.value != null ? `${Math.round(components.rhr.value)}bpm` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Sleep</p>
              <p className="text-sm font-semibold tabular-nums">
                {components.sleep.value != null ? formatMinutes(components.sleep.value) : "—"}
                {components.sleep.subscore != null && (
                  <span className="ml-1 font-normal" style={{ color: "var(--muted)" }}>
                    · {Math.round(components.sleep.subscore)} vs. your avg
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Resp. rate</p>
              <p className="text-sm font-semibold tabular-nums">
                {components.resp.value != null ? `${components.resp.value.toFixed(1)}br/min` : "—"}
              </p>
            </div>
          </div>
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
