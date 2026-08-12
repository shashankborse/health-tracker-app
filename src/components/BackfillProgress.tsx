"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "./Card";

const METRIC_LABELS: Record<string, string> = {
  steps: "steps",
  resting_heart_rate: "resting heart rate",
  hrv: "heart rate variability",
  respiratory_rate: "respiratory rate",
  skin_temperature: "skin temperature",
  spo2: "blood oxygen",
  sleep: "sleep",
  weight: "weight",
  body_fat: "body fat",
};

export default function BackfillProgress({ initialStatus }: { initialStatus: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(initialStatus !== "completed");
  const [label, setLabel] = useState("Starting sync…");
  const [error, setError] = useState<string | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (initialStatus === "completed") return;
    stoppedRef.current = false;

    async function step() {
      if (stoppedRef.current) return;
      try {
        const res = await fetch("/api/google-health/backfill", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sync failed.");
        if (data.done) {
          setRunning(false);
          router.refresh();
          return;
        }
        const metricLabel = METRIC_LABELS[data.metric as string] ?? data.metric;
        setLabel(`Syncing ${metricLabel}… (${data.metricIndex + 1}/${data.totalMetrics})`);
        if (!stoppedRef.current) setTimeout(step, 400);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setRunning(false);
      }
    }
    step();

    return () => {
      stoppedRef.current = true;
    };
  }, [initialStatus, router]);

  if (!running && !error) return null;

  return (
    <Card className="p-4">
      {error ? (
        <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
          Sync error: {error}
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-full border-2"
            style={{
              borderColor: "var(--accent)",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p className="text-sm font-medium">{label}</p>
        </div>
      )}
    </Card>
  );
}
