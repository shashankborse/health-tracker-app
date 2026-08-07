import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.session_id || !body?.client_id) {
    return NextResponse.json(
      { error: "session_id and client_id are required." },
      { status: 400 }
    );
  }
  if (body.rpe !== null && body.rpe !== undefined && (body.rpe < 1 || body.rpe > 10)) {
    return NextResponse.json({ error: "rpe must be between 1 and 10." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("run_logs")
    .upsert(
      {
        session_id: body.session_id,
        client_id: body.client_id,
        distance_km: body.distance_km ?? null,
        duration_seconds: body.duration_seconds ?? null,
        rpe: body.rpe ?? null,
      },
      { onConflict: "client_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ log: data }, { status: 201 });
}
