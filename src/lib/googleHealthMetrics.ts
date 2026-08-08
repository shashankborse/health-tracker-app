import { getSupabaseServerClient } from "./supabaseServer";
import { getValidAccessToken } from "./googleHealth";

const API_BASE = "https://health.googleapis.com/v4/users/me/dataTypes";

// Hard backstop so a metric can't walk backward forever if the "empty
// window means exhausted" heuristic below ever misfires on a real API
// quirk. Comfortably older than any plausible Fitbit history.
const HISTORY_FLOOR = "2018-01-01";

type SupabaseClient = ReturnType<typeof getSupabaseServerClient>;

type BackfillCursor = {
  metricIndex: number;
  windowEnd: string; // exclusive upper bound, YYYY-MM-DD
  pageToken: string | null;
};

type FetchPageResult = { rawDataPoints: any[]; nextPageToken: string | null };

type Metric = {
  name: string;
  dataType: string; // kebab-case URL path segment
  filterKey: string; // exact snake_case union field name Google's filter syntax expects
  filterSuffix: string; // e.g. "date", "interval.civil_start_time"
  pageSize?: number;
  maxWindowDays?: number; // this dataType's own query-range cap; defaults to 90
  // Overrides the default GET dataPoints.list call — needed for dataTypes
  // (like total-calories) that only support the POST dailyRollUp/rollUp
  // actions instead. See total_calories below.
  fetchPage?: (accessToken: string, windowStart: string, windowEnd: string, pageToken: string | null) => Promise<FetchPageResult>;
  // Rollup responses are already reconciled across every source server-side
  // and carry no per-point dataSource field — the FITBIT-only filter both
  // backfill and sync apply doesn't apply (and would silently zero out
  // every row if it did). Set alongside a custom fetchPage that already
  // scopes sources itself (e.g. via dataSourceFamily).
  skipPlatformFilter?: boolean;
  upsert: (supabase: SupabaseClient, dataPoints: any[]) => Promise<number>;
};

function civilDateToISO(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

async function upsertOne(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string
): Promise<number> {
  if (!rows.length) return 0;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  return rows.length;
}

const METRICS: Metric[] = [
  {
    name: "steps",
    dataType: "steps",
    filterKey: "steps",
    filterSuffix: "interval.civil_start_time",
    pageSize: 10000, // avoid a day's sub-intervals splitting across pages
    upsert: async (supabase, points) => {
      const byDate = new Map<string, number>();
      for (const p of points) {
        const date = p.steps?.interval?.civilStartTime?.date;
        if (!date || p.steps?.count == null) continue;
        const iso = civilDateToISO(date);
        byDate.set(iso, (byDate.get(iso) ?? 0) + Number(p.steps.count));
      }
      const rows = [...byDate.entries()].map(([entry_date, count]) => ({ entry_date, count }));
      return upsertOne(supabase, "daily_steps", rows, "entry_date");
    },
  },
  {
    name: "resting_heart_rate",
    dataType: "daily-resting-heart-rate",
    filterKey: "daily_resting_heart_rate",
    filterSuffix: "date",
    upsert: async (supabase, points) => {
      const rows = points
        .map((p) => p.dailyRestingHeartRate)
        .filter((v) => v?.date && v?.beatsPerMinute != null)
        .map((v) => ({ entry_date: civilDateToISO(v.date), beats_per_minute: Number(v.beatsPerMinute) }));
      return upsertOne(supabase, "daily_resting_heart_rate", rows, "entry_date");
    },
  },
  {
    name: "hrv",
    dataType: "daily-heart-rate-variability",
    filterKey: "daily_heart_rate_variability",
    filterSuffix: "date",
    upsert: async (supabase, points) => {
      const rows = points
        .map((p) => p.dailyHeartRateVariability)
        .filter((v) => v?.date)
        .map((v) => ({
          entry_date: civilDateToISO(v.date),
          average_ms: v.averageHeartRateVariabilityMilliseconds ?? null,
          non_rem_bpm: v.nonRemHeartRateBeatsPerMinute != null ? Number(v.nonRemHeartRateBeatsPerMinute) : null,
          entropy: v.entropy ?? null,
          deep_sleep_rmssd_ms: v.deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds ?? null,
        }));
      return upsertOne(supabase, "daily_hrv", rows, "entry_date");
    },
  },
  {
    name: "respiratory_rate",
    dataType: "daily-respiratory-rate",
    filterKey: "daily_respiratory_rate",
    filterSuffix: "date",
    upsert: async (supabase, points) => {
      const rows = points
        .map((p) => p.dailyRespiratoryRate)
        .filter((v) => v?.date && v?.breathsPerMinute != null)
        .map((v) => ({ entry_date: civilDateToISO(v.date), breaths_per_minute: v.breathsPerMinute }));
      return upsertOne(supabase, "daily_respiratory_rate", rows, "entry_date");
    },
  },
  {
    name: "skin_temperature",
    dataType: "daily-sleep-temperature-derivations",
    filterKey: "daily_sleep_temperature_derivations",
    filterSuffix: "date",
    upsert: async (supabase, points) => {
      const rows = points
        .map((p) => p.dailySleepTemperatureDerivations)
        .filter((v) => v?.date && v?.nightlyTemperatureCelsius != null)
        .map((v) => ({
          entry_date: civilDateToISO(v.date),
          nightly_temperature_c: v.nightlyTemperatureCelsius,
          baseline_temperature_c: v.baselineTemperatureCelsius ?? null,
          relative_nightly_stddev_30d_c: v.relativeNightlyStddev30dCelsius ?? null,
        }));
      return upsertOne(supabase, "daily_skin_temperature", rows, "entry_date");
    },
  },
  {
    name: "spo2",
    dataType: "daily-oxygen-saturation",
    filterKey: "daily_oxygen_saturation",
    filterSuffix: "date",
    upsert: async (supabase, points) => {
      const rows = points
        .map((p) => p.dailyOxygenSaturation)
        .filter((v) => v?.date && v?.averagePercentage != null)
        .map((v) => ({
          entry_date: civilDateToISO(v.date),
          average_pct: v.averagePercentage,
          lower_bound_pct: v.lowerBoundPercentage ?? null,
          upper_bound_pct: v.upperBoundPercentage ?? null,
          stddev_pct: v.standardDeviationPercentage ?? null,
        }));
      return upsertOne(supabase, "daily_spo2", rows, "entry_date");
    },
  },
  {
    name: "sleep",
    dataType: "sleep",
    filterKey: "sleep",
    filterSuffix: "interval.civil_end_time",
    pageSize: 25, // sleep's own default/max page size
    upsert: async (supabase, points) => {
      const minutesFor = (stagesSummary: any[] | undefined, type: string) => {
        const entry = stagesSummary?.find((s) => s.type === type);
        return entry?.minutes != null ? Number(entry.minutes) : null;
      };
      const rows = points
        .map((p) => ({ name: p.name, sleep: p.sleep }))
        .filter((p) => p.sleep?.interval?.startTime && p.sleep?.interval?.endTime)
        .map((p) => {
          const s = p.sleep;
          return {
            google_data_point_name: p.name || null,
            start_time: s.interval.startTime,
            end_time: s.interval.endTime,
            sleep_type: s.type ?? null,
            total_minutes: s.summary?.minutesInSleepPeriod != null ? Number(s.summary.minutesInSleepPeriod) : null,
            deep_minutes: minutesFor(s.summary?.stagesSummary, "DEEP"),
            rem_minutes: minutesFor(s.summary?.stagesSummary, "REM"),
            light_minutes: minutesFor(s.summary?.stagesSummary, "LIGHT"),
            awake_minutes: minutesFor(s.summary?.stagesSummary, "AWAKE"),
            stages_json: s.stages ?? null,
          };
        });
      const named = rows.filter((r) => r.google_data_point_name);
      const unnamed = rows.filter((r) => !r.google_data_point_name);
      let count = await upsertOne(supabase, "sleep_sessions", named, "google_data_point_name");
      if (unnamed.length) {
        const { error } = await supabase.from("sleep_sessions").insert(unnamed);
        if (error) throw new Error(`sleep_sessions insert failed: ${error.message}`);
        count += unnamed.length;
      }
      return count;
    },
  },
  {
    name: "weight",
    dataType: "weight",
    filterKey: "weight",
    filterSuffix: "sample_time.civil_time",
    upsert: async (supabase, points) => {
      let count = 0;
      for (const p of points) {
        const w = p.weight;
        const date = w?.sampleTime?.civilTime?.date;
        if (!date || w?.weightGrams == null) continue;
        const entry_date = civilDateToISO(date);
        const weight_kg = Number((w.weightGrams / 1000).toFixed(2));
        const { data: existing } = await supabase
          .from("weight_entries")
          .select("id,source")
          .eq("entry_date", entry_date)
          .maybeSingle();
        // Manual entries always win — never overwrite them with synced data.
        if (existing?.source === "manual") continue;
        if (existing) {
          await supabase.from("weight_entries").update({ weight_kg, source: "google_health" }).eq("id", existing.id);
        } else {
          await supabase.from("weight_entries").insert({ entry_date, weight_kg, source: "google_health" });
        }
        count++;
      }
      return count;
    },
  },
  {
    name: "body_fat",
    dataType: "body-fat",
    filterKey: "body_fat",
    filterSuffix: "sample_time.civil_time",
    upsert: async (supabase, points) => {
      let count = 0;
      for (const p of points) {
        const b = p.bodyFat;
        const date = b?.sampleTime?.civilTime?.date;
        if (!date || b?.percentage == null) continue;
        const entry_date = civilDateToISO(date);
        // Only attaches to a weight row that already exists — never creates
        // one on its own, since weight_entries.weight_kg is required.
        const { data: existing } = await supabase
          .from("weight_entries")
          .select("id,source,body_fat_pct")
          .eq("entry_date", entry_date)
          .maybeSingle();
        if (!existing || (existing.source === "manual" && existing.body_fat_pct != null)) continue;
        await supabase
          .from("weight_entries")
          .update({ body_fat_pct: Number(b.percentage.toFixed(2)) })
          .eq("id", existing.id);
        count++;
      }
      return count;
    },
  },
  {
    // Confirmed live against the real discovery doc (health.googleapis.com/
    // $discovery/rest?version=v4): total-calories is NOT a dataPoints.list-
    // able type — a real backfill attempt 400'd with "List is not supported
    // for data type total-calories, but the following actions are
    // supported: rollup, dailyRollup". Uses the POST dailyRollUp action
    // instead, which already sums to one row per civil day (windowSizeDays
    // defaults to 1) and returns no nextPageToken at all — no pagination
    // loop needed for a ≤14-day window. dataSourceFamily scopes to wearables
    // (Fitbit/Pixel Watch, excludes manual entries) as this rollup's closest
    // equivalent to the FITBIT-platform filter every list-based metric uses;
    // rollup responses have no per-point dataSource field to filter on.
    name: "total_calories",
    dataType: "total-calories",
    filterKey: "total_calories",
    filterSuffix: "interval.civil_start_time", // unused — fetchPage overrides the default GET
    maxWindowDays: 14, // this dataType's own documented cap, vs. every other metric's 90
    skipPlatformFilter: true,
    fetchPage: async (accessToken, windowStart, windowEnd) => {
      const toDate = (iso: string) => {
        const [year, month, day] = iso.split("-").map(Number);
        return { year, month, day };
      };
      const res = await fetch(`${API_BASE}/total-calories/dataPoints:dailyRollUp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          range: { start: { date: toDate(windowStart) }, end: { date: toDate(windowEnd) } },
          dataSourceFamily: "users/me/dataSourceFamilies/google-wearables",
        }),
      });
      if (!res.ok) {
        throw new Error(`Google Health API error for total-calories: ${res.status} ${await res.text()}`);
      }
      const body = await res.json();
      return { rawDataPoints: body.rollupDataPoints ?? [], nextPageToken: null };
    },
    upsert: async (supabase, points) => {
      const rows = points
        .filter((p) => p.civilStartTime?.date && p.totalCalories?.kcalSum != null)
        .map((p) => ({ entry_date: civilDateToISO(p.civilStartTime.date), kcal: Number(p.totalCalories.kcalSum) }));
      return upsertOne(supabase, "daily_total_calories", rows, "entry_date");
    },
  },
];

function filterExpr(metric: Metric, start: string, end: string): string {
  return `${metric.filterKey}.${metric.filterSuffix} >= "${start}" AND ${metric.filterKey}.${metric.filterSuffix} < "${end}"`;
}

// The GET dataPoints.list call every metric used until total_calories
// needed its own POST dailyRollUp shape instead (see METRICS above).
async function defaultFetchPage(
  metric: Metric,
  accessToken: string,
  windowStart: string,
  windowEnd: string,
  pageToken: string | null
): Promise<FetchPageResult> {
  const params = new URLSearchParams({ filter: filterExpr(metric, windowStart, windowEnd) });
  if (metric.pageSize) params.set("pageSize", String(metric.pageSize));
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${API_BASE}/${metric.dataType}/dataPoints?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google Health API error for ${metric.dataType}: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return { rawDataPoints: body.dataPoints ?? [], nextPageToken: body.nextPageToken ?? null };
}

export type BackfillChunkResult = {
  done: boolean;
  metric?: string;
  metricIndex?: number;
  totalMetrics?: number;
  windowEnd?: string;
  rowsWritten?: number;
};

/**
 * Does ONE unit of backfill work — one data type × one ≤90-day window × one
 * page — and persists progress to backfill_cursor so the next call (driven
 * by the client's progress screen) can resume exactly where this left off.
 * Never a single long-running call, per Google's own rate-limit guidance to
 * keep backfill paced and separate from onboarding.
 */
export async function runBackfillChunk(): Promise<BackfillChunkResult> {
  const supabase = getSupabaseServerClient();
  const { data: connection, error } = await supabase
    .from("google_health_connection")
    .select("backfill_status, backfill_cursor")
    .eq("id", "default")
    .single();
  if (error || !connection) throw new Error("Google Health is not connected.");
  if (connection.backfill_status === "completed") return { done: true };

  const cursor: BackfillCursor = connection.backfill_cursor ?? {
    metricIndex: 0,
    windowEnd: todayISO(),
    pageToken: null,
  };
  if (cursor.metricIndex >= METRICS.length) {
    await supabase
      .from("google_health_connection")
      .update({ backfill_status: "completed", backfill_cursor: null })
      .eq("id", "default");
    return { done: true };
  }

  const metric = METRICS[cursor.metricIndex];
  const windowEnd = cursor.windowEnd;
  const rawWindowStart = addDaysISO(windowEnd, -(metric.maxWindowDays ?? 90));
  const windowStart = rawWindowStart < HISTORY_FLOOR ? HISTORY_FLOOR : rawWindowStart;

  const accessToken = await getValidAccessToken();
  const { rawDataPoints, nextPageToken } = await (metric.fetchPage ?? ((...args) => defaultFetchPage(metric, ...args)))(
    accessToken,
    windowStart,
    windowEnd,
    cursor.pageToken
  );
  // Google Health can surface the SAME real-world activity from more than
  // one device (confirmed live: a day's steps were reported by both the
  // Fitbit and, separately, the phone's own motion sensor via HealthKit —
  // summing both roughly doubled the true count). SPEC.md's whole premise
  // is Fitbit-sourced data, so only Fitbit readings are ever stored — except
  // rollup-based metrics (skipPlatformFilter), whose responses are already
  // reconciled server-side with no dataSource field to filter on.
  const dataPoints = metric.skipPlatformFilter
    ? rawDataPoints
    : rawDataPoints.filter((p) => p.dataSource?.platform === "FITBIT");
  const rowsWritten = await metric.upsert(supabase, dataPoints);

  let nextCursor: BackfillCursor;
  if (nextPageToken) {
    nextCursor = { metricIndex: cursor.metricIndex, windowEnd, pageToken: nextPageToken };
  } else if (rawDataPoints.length > 0 && windowStart > HISTORY_FLOOR) {
    // This window had data of some kind — older history may still exist,
    // even if none of it happened to be Fitbit-sourced in this window.
    nextCursor = { metricIndex: cursor.metricIndex, windowEnd: windowStart, pageToken: null };
  } else {
    // Empty window (or we've hit the floor) — this metric is exhausted.
    nextCursor = { metricIndex: cursor.metricIndex + 1, windowEnd: todayISO(), pageToken: null };
  }

  const status = nextCursor.metricIndex >= METRICS.length ? "completed" : "in_progress";
  await supabase
    .from("google_health_connection")
    .update({
      backfill_status: status,
      backfill_cursor: status === "completed" ? null : nextCursor,
    })
    .eq("id", "default");

  return {
    done: status === "completed",
    metric: metric.name,
    metricIndex: cursor.metricIndex,
    totalMetrics: METRICS.length,
    windowEnd,
    rowsWritten,
  };
}

// A small overlap behind "today" so a day whose Fitbit sync finalized late
// (e.g. last night's sleep summary computed after this ran) still gets
// picked up on the next call rather than being permanently missed.
const RECENT_SYNC_DAYS = 3;

export type SyncResult = { metricsSynced: string[]; rowsWritten: number };

/**
 * Re-fetches the last few days for every metric in one pass — unlike
 * backfill, this isn't chunked/resumable, since a handful of days is small
 * enough to finish well within one request. Used by both the daily Vercel
 * Cron and the on-demand "app just opened" refresh.
 */
export async function syncRecentData(): Promise<SyncResult> {
  const supabase = getSupabaseServerClient();
  const { data: connection } = await supabase
    .from("google_health_connection")
    .select("id")
    .eq("id", "default")
    .maybeSingle();
  if (!connection) return { metricsSynced: [], rowsWritten: 0 };

  const windowStart = addDaysISO(todayISO(), -RECENT_SYNC_DAYS);
  const windowEnd = addDaysISO(todayISO(), 1); // exclusive upper bound — include all of today

  const accessToken = await getValidAccessToken();
  const metricsSynced: string[] = [];
  let rowsWritten = 0;

  for (const metric of METRICS) {
    let pageToken: string | null = null;
    do {
      const { rawDataPoints, nextPageToken } = await (metric.fetchPage ?? ((...args) => defaultFetchPage(metric, ...args)))(
        accessToken,
        windowStart,
        windowEnd,
        pageToken
      );
      const dataPoints = metric.skipPlatformFilter
        ? rawDataPoints
        : rawDataPoints.filter((p) => p.dataSource?.platform === "FITBIT");
      rowsWritten += await metric.upsert(supabase, dataPoints);
      pageToken = nextPageToken;
    } while (pageToken);
    metricsSynced.push(metric.name);
  }

  await supabase
    .from("google_health_connection")
    .update({ last_daily_sync_at: new Date().toISOString() })
    .eq("id", "default");

  return { metricsSynced, rowsWritten };
}
