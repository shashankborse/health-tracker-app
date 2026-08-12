import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { sendPushNotification } from "@/lib/webPush";
import { todayLocalISODate } from "@/lib/date";

// Hit daily by Vercel Cron near 7:30am Dublin time (see vercel.json) —
// same CRON_SECRET pattern as /api/backup/run, and same fixed-UTC-time
// drift caveat (approximates 7:30am during BST, ~1hr early during winter
// GMT; accepted, matching the backup job's precedent).
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not set." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  const today = todayLocalISODate();
  const { data: todaysEntry } = await supabase
    .from("weight_entries")
    .select("id")
    .eq("entry_date", today)
    .maybeSingle();

  if (todaysEntry) {
    return NextResponse.json({ ok: true, skipped: "already_logged_today" });
  }

  const { data: subscriptions } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: "no_subscriptions" });
  }

  let sent = 0;
  const expiredIds: string[] = [];
  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub, {
      title: "Log today's weight",
      body: "Tap to log your weight for today.",
      url: "/weight",
    });
    if (result.ok) sent++;
    if (result.expired) expiredIds.push(sub.id);
  }

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return NextResponse.json({ ok: true, sent, expiredRemoved: expiredIds.length });
}
