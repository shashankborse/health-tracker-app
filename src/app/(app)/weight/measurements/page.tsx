import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import MetricTrendCard from "@/components/MetricTrendCard";
import WeeklyMeasurementForm from "@/components/WeeklyMeasurementForm";

export const dynamic = "force-dynamic";

type WeeklyMeasurement = {
  id: string;
  week_date: string;
  arm_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
};

type ProgressPhoto = {
  weekly_measurement_id: string;
  pose: string;
  drive_view_link: string;
};

const POSE_LABELS: Record<string, string> = {
  front: "Front",
  left_side: "Left side",
  right_side: "Right side",
  back: "Back",
};

function formatWeek(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function WeeklyMeasurementsPage() {
  const supabase = getSupabaseServerClient();
  const [{ data: measurementsData }, { data: photosData }] = await Promise.all([
    supabase.from("weekly_measurements").select("*").order("week_date", { ascending: false }),
    supabase.from("progress_photos").select("weekly_measurement_id,pose,drive_view_link"),
  ]);

  const measurements = (measurementsData ?? []) as WeeklyMeasurement[];
  const photos = (photosData ?? []) as ProgressPhoto[];
  const photosByWeek = new Map<string, ProgressPhoto[]>();
  for (const photo of photos) {
    const list = photosByWeek.get(photo.weekly_measurement_id) ?? [];
    list.push(photo);
    photosByWeek.set(photo.weekly_measurement_id, list);
  }

  const chronological = [...measurements].reverse();
  const trendPoints = (field: keyof WeeklyMeasurement) =>
    chronological
      .filter((m) => m[field] != null)
      .map((m) => ({ date: m.week_date, value: m[field] as number }));

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center gap-2 px-1">
        <Link href="/weight" aria-label="Back to Weight" className="active:opacity-60">
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Weekly Measurements</h1>
      </div>

      <WeeklyMeasurementForm />

      <MetricTrendCard title="Arm" unit="cm" points={trendPoints("arm_cm")} />
      <MetricTrendCard title="Chest" unit="cm" points={trendPoints("chest_cm")} />
      <MetricTrendCard title="Waist" unit="cm" points={trendPoints("waist_cm")} />
      <MetricTrendCard title="Hip" unit="cm" points={trendPoints("hip_cm")} />
      <MetricTrendCard title="Thigh" unit="cm" points={trendPoints("thigh_cm")} />

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          History
        </h2>
        {measurements.length === 0 ? (
          <div className="rounded-2xl bg-card p-4 text-sm shadow-sm" style={{ color: "var(--muted)" }}>
            No entries yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {measurements.map((m) => (
              <div key={m.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <p className="text-base font-semibold">{formatWeek(m.week_date)}</p>
                <div className="mt-2 grid grid-cols-3 gap-y-1 text-sm">
                  {m.arm_cm != null && <p>Arm: {m.arm_cm} cm</p>}
                  {m.chest_cm != null && <p>Chest: {m.chest_cm} cm</p>}
                  {m.waist_cm != null && <p>Waist: {m.waist_cm} cm</p>}
                  {m.hip_cm != null && <p>Hip: {m.hip_cm} cm</p>}
                  {m.thigh_cm != null && <p>Thigh: {m.thigh_cm} cm</p>}
                </div>
                {m.notes && (
                  <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                    {m.notes}
                  </p>
                )}
                {(photosByWeek.get(m.id) ?? []).length > 0 && (
                  <div className="mt-3 flex gap-3">
                    {(photosByWeek.get(m.id) ?? []).map((photo, i) => (
                      <a
                        key={i}
                        href={photo.drive_view_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium"
                        style={{ color: "var(--accent)" }}
                      >
                        {POSE_LABELS[photo.pose] ?? photo.pose} photo →
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
