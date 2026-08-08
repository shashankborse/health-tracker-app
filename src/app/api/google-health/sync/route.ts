import { NextResponse } from "next/server";
import { syncRecentData } from "@/lib/googleHealthMetrics";

// Hit daily by Vercel Cron (see vercel.json) — re-syncs the last few days
// for every metric so newly recorded Fitbit data shows up without waiting
// for the next full historical backfill.
export async function GET() {
  try {
    const result = await syncRecentData();
    return NextResponse.json({ ok: true, ...result, syncedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
