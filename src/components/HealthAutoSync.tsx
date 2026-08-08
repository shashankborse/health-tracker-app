"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Renders null — just fires a background sync-if-stale check once when the
// shared (app) layout first mounts (i.e. on a real app open), not on every
// client-side navigation between tabs, since the layout persists across
// those. Refreshes the current page's Server Component data if a sync
// actually ran, so newly synced data shows up without a manual reload.
export default function HealthAutoSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/google-health/sync-if-stale", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.synced) router.refresh();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
