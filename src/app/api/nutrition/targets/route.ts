import { NextRequest, NextResponse } from "next/server";
import { computeDailyTargets } from "@/lib/nutritionTargets";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD." }, { status: 400 });
  }

  const targets = await computeDailyTargets(date);
  return NextResponse.json({ targets });
}
