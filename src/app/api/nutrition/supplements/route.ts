import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const TIMING_VALUES = new Set(["am", "pm", "with_meal"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Returns every active supplement plus, for the given ?date=, whether it's
// already been logged that day — same "today is always client-supplied"
// posture as /api/nutrition/logs, since the server clock and the user's
// local day boundary can disagree right around midnight.
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "?date=YYYY-MM-DD is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const [{ data: supplements, error: supplementsError }, { data: logs, error: logsError }] = await Promise.all([
    supabase.from("supplements").select("*").eq("active", true).order("created_at", { ascending: true }),
    supabase.from("supplement_logs").select("supplement_id, client_id").eq("log_date", date),
  ]);

  if (supplementsError || logsError) {
    return NextResponse.json({ error: (supplementsError || logsError)?.message }, { status: 500 });
  }

  const loggedBySupplementId = new Map((logs ?? []).map((l) => [l.supplement_id, l.client_id]));
  const withStatus = (supplements ?? []).map((s) => ({
    ...s,
    logged_client_id: loggedBySupplementId.get(s.id) ?? null,
  }));

  return NextResponse.json({ supplements: withStatus });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (!TIMING_VALUES.has(body.timing)) {
    return NextResponse.json({ error: "timing must be am, pm, or with_meal." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("supplements")
    .insert({
      name: body.name.trim(),
      dose_description: typeof body.dose_description === "string" && body.dose_description.trim() ? body.dose_description.trim() : null,
      purpose: typeof body.purpose === "string" && body.purpose.trim() ? body.purpose.trim() : null,
      timing: body.timing,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ supplement: data }, { status: 201 });
}
