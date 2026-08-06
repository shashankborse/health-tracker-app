import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// Hit daily by Vercel Cron (see vercel.json) so the free Supabase project
// never auto-pauses from a week of inactivity. Does the smallest possible
// real query rather than nothing, so it counts as genuine activity.
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    // `weight_logs` is created in Phase 2 — until then this 404s from
    // Supabase's side, which is fine; the request itself is what keeps
    // the project active.
    await supabase.from("weight_logs").select("id").limit(1);
    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
