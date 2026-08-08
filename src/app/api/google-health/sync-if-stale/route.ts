import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { syncRecentData } from "@/lib/googleHealthMetrics";

const STALE_MS = 30 * 60 * 1000;

// Called once per app open (see HealthAutoSync.tsx) so opening the app
// pulls the latest available data rather than showing a stale cached view,
// without re-syncing on every navigation within an already-open session.
export async function POST() {
  const supabase = getSupabaseServerClient();
  const { data: connection } = await supabase
    .from("google_health_connection")
    .select("last_daily_sync_at")
    .eq("id", "default")
    .maybeSingle();
  if (!connection) {
    return NextResponse.json({ synced: false, reason: "not_connected" });
  }

  const lastSync = connection.last_daily_sync_at ? new Date(connection.last_daily_sync_at).getTime() : 0;
  if (Date.now() - lastSync < STALE_MS) {
    return NextResponse.json({ synced: false, reason: "fresh" });
  }

  try {
    const result = await syncRecentData();
    return NextResponse.json({ synced: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { synced: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
