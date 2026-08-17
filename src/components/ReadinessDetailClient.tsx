"use client";

import { useState } from "react";
import ReadinessTrendChart from "./ReadinessTrendChart";
import ReadinessCard, { BAND_LABELS, formatMinutes } from "./ReadinessCard";
import Card from "./Card";
import MiniBar from "./MiniBar";
import type { ReadinessComponent, ReadinessResult } from "@/lib/readiness";

type View = "day" | "week" | "month";
const VIEWS: View[] = ["day", "week", "month"];

function toPoints(series: ReadinessResult[]) {
  return series.filter((r) => r.score != null).map((r) => ({ date: r.date, value: r.score as number }));
}

// Baseline-delta captions for the Breakdown/What-drove-it cards — real
// numbers from readiness.ts's baselineMean, not fabricated deltas.
function hrvNote(c: ReadinessComponent): string | null {
  if (c.value == null || c.baselineMean == null) return null;
  const diff = Math.round(c.value - c.baselineMean);
  if (diff === 0) return "right at your baseline";
  return `${diff > 0 ? "+" : ""}${diff}ms vs. baseline`;
}
function rhrNote(c: ReadinessComponent): string | null {
  if (c.value == null || c.baselineMean == null) return null;
  const diff = Math.round(c.value - c.baselineMean);
  if (diff === 0) return "right at your baseline";
  return `${Math.abs(diff)}bpm ${diff > 0 ? "above" : "below"} baseline`;
}
function respNote(c: ReadinessComponent): string | null {
  if (c.value == null || c.baselineMean == null) return null;
  const diff = c.value - c.baselineMean;
  if (Math.abs(diff) < 0.5) return "stable vs. your baseline";
  return `${diff > 0 ? "elevated" : "lower"} vs. your baseline`;
}
function sleepNote(c: ReadinessComponent): string | null {
  return c.subscore != null ? `${Math.round(c.subscore)} vs. your avg` : null;
}

export default function ReadinessDetailClient({
  series,
  spo2Today,
  skinTempToday,
}: {
  series: ReadinessResult[];
  spo2Today?: number | null;
  skinTempToday?: number | null;
}) {
  const [view, setView] = useState<View>("day");
  const today = series[series.length - 1];
  const weekPoints = toPoints(series.slice(-7));
  const monthPoints = toPoints(series);

  const { components, band } = today;
  const drivers =
    band != null
      ? [
          { key: "hrv", label: "HRV", pct: components.hrv.subscore, color: "var(--recovery)", note: hrvNote(components.hrv) },
          { key: "rhr", label: "Resting HR", pct: components.rhr.subscore, color: "var(--strain)", note: rhrNote(components.rhr) },
          { key: "sleep", label: "Sleep", pct: components.sleep.subscore, color: "var(--sleep)", note: sleepNote(components.sleep) },
          { key: "resp", label: "Resp. rate", pct: components.resp.subscore, color: "var(--fuel)", note: respNote(components.resp) },
        ].filter((d) => d.pct != null)
      : [];
  const limitingFactor = drivers.length ? drivers.reduce((min, d) => (d.pct! < min.pct! ? d : min)) : null;
  const coachNote =
    band == null
      ? null
      : band === "optimal"
        ? "You're well recovered today — a good day to push training intensity."
        : limitingFactor
          ? `${BAND_LABELS[band]} readiness today. ${limitingFactor.label} is your main limiting factor.`
          : `${BAND_LABELS[band]} readiness today.`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: "var(--surface-2)" }}>
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="flex-1 rounded-lg py-1.5 text-sm font-semibold capitalize active:opacity-70"
            style={{
              backgroundColor: view === v ? "var(--card)" : "transparent",
              color: view === v ? "var(--foreground)" : "var(--muted)",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "day" ? (
        <>
          <ReadinessCard readiness={today} />

          {band != null && (
            <>
              <Card className="p-4">
                <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                  Breakdown
                </p>
                <div className="mt-2 flex flex-col">
                  {[
                    { label: "HRV", value: components.hrv.value != null ? `${Math.round(components.hrv.value)}ms` : "—", note: hrvNote(components.hrv) },
                    { label: "Resting HR", value: components.rhr.value != null ? `${Math.round(components.rhr.value)}bpm` : "—", note: rhrNote(components.rhr) },
                    { label: "Sleep", value: components.sleep.value != null ? formatMinutes(components.sleep.value) : "—", note: sleepNote(components.sleep) },
                    { label: "Resp. rate", value: components.resp.value != null ? `${components.resp.value.toFixed(1)}br/min` : "—", note: respNote(components.resp) },
                    ...(spo2Today != null ? [{ label: "SpO₂", value: `${spo2Today}%`, note: null }] : []),
                    // Skin temperature is a signed deviation from a 30-day baseline
                    // (typically within ±1-2°C) — guard against an implausible
                    // synced value rendering as a nonsensical breakdown row.
                    ...(skinTempToday != null && Math.abs(skinTempToday) < 5
                      ? [{ label: "Skin temperature", value: `${skinTempToday > 0 ? "+" : ""}${skinTempToday.toFixed(1)}°C`, note: null }]
                      : []),
                  ].map((row, i, arr) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-2.5 text-sm"
                      style={i < arr.length - 1 ? { borderBottom: "1px solid var(--border)" } : undefined}
                    >
                      <span>{row.label}</span>
                      <span className="text-right">
                        <span className="font-semibold tabular-nums">{row.value}</span>
                        {row.note && (
                          <span className="block text-xs" style={{ color: "var(--muted)" }}>{row.note}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {drivers.length > 0 && (
                <Card className="p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                    What drove it
                  </p>
                  <div className="mt-3 flex flex-col gap-3">
                    {drivers.map((d) => (
                      <div key={d.key}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-medium">{d.label}</span>
                          <span className="font-semibold tabular-nums">{Math.round(d.pct!)}%</span>
                        </div>
                        <MiniBar pct={d.pct!} color={d.color} />
                        {d.note && (
                          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{d.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {coachNote && (
                <Card className="p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                    Coach note
                  </p>
                  <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>{coachNote}</p>
                </Card>
              )}

              <Card className="p-4">
                <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                  How this is measured
                </p>
                <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
                  Readiness blends HRV (40%), resting heart rate (30%), sleep (20%), and respiratory-rate
                  stability (10%) against your personal 30-day baseline. Optimal (67–100) means push,
                  Moderate (34–66) means maintain, Low (0–33) means rest.
                </p>
              </Card>
            </>
          )}
        </>
      ) : (
        <Card className="p-4">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            {view === "week" ? "Last 7 days" : "Last 30 days"}
          </p>
          {(view === "week" ? weekPoints : monthPoints).length >= 2 ? (
            <ReadinessTrendChart points={view === "week" ? weekPoints : monthPoints} height={220} />
          ) : (
            <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              Not enough data yet.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
