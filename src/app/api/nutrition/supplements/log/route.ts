import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Logging is a toggle, not an accumulator — a unique index on
// (supplement_id, log_date) means at most one row exists per supplement
// per day; tapping again DELETEs it (see below) rather than stacking.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.supplement_id || !body?.client_id) {
    return NextResponse.json({ error: "supplement_id and client_id are required." }, { status: 400 });
  }
  if (!body.log_date || !DATE_RE.test(body.log_date)) {
    return NextResponse.json({ error: "log_date must be YYYY-MM-DD." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("supplement_logs")
    .upsert(
      { supplement_id: body.supplement_id, log_date: body.log_date, client_id: body.client_id },
      { onConflict: "client_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ log: data }, { status: 201 });
}

// Deletes by client_id, same reasoning as food_log_entries/exercise_logs —
// works whether the log already synced or is still only in the offline queue.
export async function DELETE(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id is required." }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("supplement_logs").delete().eq("client_id", clientId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
