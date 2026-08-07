import { NextResponse } from "next/server";
import { runBackfillChunk } from "@/lib/googleHealthMetrics";

// Called repeatedly by the Health tab's progress UI until it reports
// done: true — each call does one small, idempotent chunk of work.
export async function POST() {
  try {
    const result = await runBackfillChunk();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
