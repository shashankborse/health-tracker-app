import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// Get-or-create today's (or a given date's) session for a plan day.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.plan_day_id || !body?.session_date) {
    return NextResponse.json(
      { error: "plan_day_id and session_date are required." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .upsert(
      { plan_day_id: body.plan_day_id, session_date: body.session_date },
      { onConflict: "plan_day_id,session_date", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ session: data }, { status: 201 });
}
