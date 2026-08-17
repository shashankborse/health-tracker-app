import { getSupabaseServerClient } from "./supabaseServer";

export type ReadinessBand = "low" | "moderate" | "optimal";

export type ReadinessComponent = { value: number | null; subscore: number | null; baselineMean: number | null };

export type ReadinessResult = {
  date: string;
  score: number | null;
  band: ReadinessBand | null;
  provisional: boolean;
  components: {
    hrv: ReadinessComponent;
    rhr: ReadinessComponent;
    sleep: ReadinessComponent;
    resp: ReadinessComponent;
  };
};

// SPEC.md:83 — HRV 40% / resting HR 30% / sleep 20% / respiratory-rate
// stability 10%, rolling 30-day personal baseline, 0-100.
const WEIGHTS = { hrv: 0.4, rhr: 0.3, sleep: 0.2, resp: 0.1 } as const;
const BASELINE_WINDOW_DAYS = 30;
// Below this many baseline samples even for the best-covered metric, the
// score is provisional per SPEC's "backfilled history shorter than 30
// days" edge case — a same-day slot per metric isn't guaranteed (a metric
// can go unsynced some days), so this is deliberately a bit under 30.
const MIN_BASELINE_SAMPLES = 20;

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Mirrors src/lib/date.ts's todayLocalISODate() offset approach, applied
// to an arbitrary timestamp — used to bucket a sleep session's end_time
// (which spans midnight) into the calendar date the user woke up on.
function dateKeyFromTimestamp(ts: string): string {
  const d = new Date(ts);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[], m: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function zScore(today: number, baseline: number[]): number {
  if (baseline.length === 0) return 0;
  const m = mean(baseline);
  const sd = stdev(baseline, m);
  return sd === 0 ? 0 : (today - m) / sd;
}

function higherIsBetter(today: number, baseline: number[]): number {
  return clamp(50 + zScore(today, baseline) * 20, 0, 100);
}

function lowerIsBetter(today: number, baseline: number[]): number {
  return clamp(50 - zScore(today, baseline) * 20, 0, 100);
}

// "Stability" (respiratory rate) — scored by closeness to personal
// baseline in either direction, not by direction, per SPEC.md:83's
// "respiratory-rate stability" wording (unlike HRV/RHR/sleep, which are
// each explicitly directional).
function stability(today: number, baseline: number[]): number {
  return clamp(100 - Math.abs(zScore(today, baseline)) * 40, 0, 100);
}

export function bandFor(score: number): ReadinessBand {
  if (score < 34) return "low";
  if (score <= 66) return "moderate";
  return "optimal";
}

type Supabase = ReturnType<typeof getSupabaseServerClient>;

async function fetchRawSeries(supabase: Supabase, fromDate: string, toDate: string) {
  const fetchFrom = addDaysISO(fromDate, -BASELINE_WINDOW_DAYS);
  const sleepFetchToExclusive = addDaysISO(toDate, 1);

  const [hrvRes, rhrRes, respRes, sleepRes] = await Promise.all([
    supabase.from("daily_hrv").select("entry_date, average_ms").gte("entry_date", fetchFrom).lte("entry_date", toDate),
    supabase
      .from("daily_resting_heart_rate")
      .select("entry_date, beats_per_minute")
      .gte("entry_date", fetchFrom)
      .lte("entry_date", toDate),
    supabase
      .from("daily_respiratory_rate")
      .select("entry_date, breaths_per_minute")
      .gte("entry_date", fetchFrom)
      .lte("entry_date", toDate),
    supabase
      .from("sleep_sessions")
      .select("end_time, total_minutes")
      .gte("end_time", `${fetchFrom}T00:00:00Z`)
      .lt("end_time", `${sleepFetchToExclusive}T00:00:00Z`),
  ]);

  const hrvByDate = new Map<string, number>();
  for (const row of hrvRes.data ?? []) {
    if (row.average_ms != null) hrvByDate.set(row.entry_date, Number(row.average_ms));
  }
  const rhrByDate = new Map<string, number>();
  for (const row of rhrRes.data ?? []) {
    rhrByDate.set(row.entry_date, Number(row.beats_per_minute));
  }
  const respByDate = new Map<string, number>();
  for (const row of respRes.data ?? []) {
    respByDate.set(row.entry_date, Number(row.breaths_per_minute));
  }
  const sleepByDate = new Map<string, number>();
  for (const row of (sleepRes.data ?? []) as { end_time: string; total_minutes: number | null }[]) {
    if (row.total_minutes == null) continue;
    const key = dateKeyFromTimestamp(row.end_time);
    sleepByDate.set(key, (sleepByDate.get(key) ?? 0) + Number(row.total_minutes));
  }

  return { hrvByDate, rhrByDate, respByDate, sleepByDate };
}

function baselineValues(byDate: Map<string, number>, date: string): number[] {
  const values: number[] = [];
  for (let i = 1; i <= BASELINE_WINDOW_DAYS; i++) {
    const v = byDate.get(addDaysISO(date, -i));
    if (v != null) values.push(v);
  }
  return values;
}

function computeForDate(
  date: string,
  series: { hrvByDate: Map<string, number>; rhrByDate: Map<string, number>; respByDate: Map<string, number>; sleepByDate: Map<string, number> }
): ReadinessResult {
  const hrvBaseline = baselineValues(series.hrvByDate, date);
  const rhrBaseline = baselineValues(series.rhrByDate, date);
  const respBaseline = baselineValues(series.respByDate, date);
  const sleepBaseline = baselineValues(series.sleepByDate, date);

  const hrvToday = series.hrvByDate.get(date) ?? null;
  const rhrToday = series.rhrByDate.get(date) ?? null;
  const respToday = series.respByDate.get(date) ?? null;
  const sleepToday = series.sleepByDate.get(date) ?? null;

  const hrvSub = hrvToday != null ? higherIsBetter(hrvToday, hrvBaseline) : null;
  const rhrSub = rhrToday != null ? lowerIsBetter(rhrToday, rhrBaseline) : null;
  const respSub = respToday != null ? stability(respToday, respBaseline) : null;
  const sleepSub = sleepToday != null ? higherIsBetter(sleepToday, sleepBaseline) : null;

  const parts: { sub: number; weight: number }[] = [];
  if (hrvSub != null) parts.push({ sub: hrvSub, weight: WEIGHTS.hrv });
  if (rhrSub != null) parts.push({ sub: rhrSub, weight: WEIGHTS.rhr });
  if (sleepSub != null) parts.push({ sub: sleepSub, weight: WEIGHTS.sleep });
  if (respSub != null) parts.push({ sub: respSub, weight: WEIGHTS.resp });

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const score = totalWeight > 0 ? Math.round(parts.reduce((sum, p) => sum + p.sub * p.weight, 0) / totalWeight) : null;

  const bestCoverage = Math.max(hrvBaseline.length, rhrBaseline.length, respBaseline.length, sleepBaseline.length);

  return {
    date,
    score,
    band: score != null ? bandFor(score) : null,
    provisional: bestCoverage < MIN_BASELINE_SAMPLES,
    components: {
      hrv: { value: hrvToday, subscore: hrvSub, baselineMean: hrvBaseline.length ? mean(hrvBaseline) : null },
      rhr: { value: rhrToday, subscore: rhrSub, baselineMean: rhrBaseline.length ? mean(rhrBaseline) : null },
      sleep: { value: sleepToday, subscore: sleepSub, baselineMean: sleepBaseline.length ? mean(sleepBaseline) : null },
      resp: { value: respToday, subscore: respSub, baselineMean: respBaseline.length ? mean(respBaseline) : null },
    },
  };
}

export async function getReadinessSeries(supabase: Supabase, fromDate: string, toDate: string): Promise<ReadinessResult[]> {
  const series = await fetchRawSeries(supabase, fromDate, toDate);
  const results: ReadinessResult[] = [];
  let cursor = fromDate;
  while (cursor <= toDate) {
    results.push(computeForDate(cursor, series));
    cursor = addDaysISO(cursor, 1);
  }
  return results;
}

export async function getReadinessForDate(supabase: Supabase, date: string): Promise<ReadinessResult> {
  const [result] = await getReadinessSeries(supabase, date, date);
  return result;
}
