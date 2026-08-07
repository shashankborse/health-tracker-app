import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = getSupabaseServerClient();
  await supabase.from("google_health_connection").delete().eq("id", "default");
  return NextResponse.json({ ok: true });
}
