import { NextRequest, NextResponse } from "next/server";
import { runBackup } from "@/lib/backup";

// Hit daily by Vercel Cron (see vercel.json). Unlike the other cron routes,
// this one touches every table including live OAuth tokens, so it's gated
// by CRON_SECRET on top of proxy.ts's public-path exemption. Vercel
// automatically sends `Authorization: Bearer <CRON_SECRET>` on its own
// cron-triggered requests when that env var is set — this checks the same
// header, so a manual/local test just needs to set it explicitly.
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not set." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runBackup();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
