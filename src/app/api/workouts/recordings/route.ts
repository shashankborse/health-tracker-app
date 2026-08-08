import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getValidDriveAccessToken, getOrCreateFolder, uploadFileToDrive } from "@/lib/googleDrive";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DRIVE_FOLDER_NAME = "Health Tracker Exercise Recordings";

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const planExerciseId = formData.get("plan_exercise_id");
  const recordedDate = formData.get("recorded_date");
  const video = formData.get("video");

  if (typeof planExerciseId !== "string" || !planExerciseId) {
    return NextResponse.json({ error: "plan_exercise_id is required." }, { status: 400 });
  }
  if (typeof recordedDate !== "string" || !DATE_RE.test(recordedDate)) {
    return NextResponse.json({ error: "recorded_date must be YYYY-MM-DD." }, { status: 400 });
  }
  if (!(video instanceof File) || video.size === 0) {
    return NextResponse.json({ error: "A video file is required." }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidDriveAccessToken();
  } catch {
    return NextResponse.json({ error: "Connect Google Drive first." }, { status: 400 });
  }

  const folderId = await getOrCreateFolder(accessToken, DRIVE_FOLDER_NAME);
  const buffer = Buffer.from(await video.arrayBuffer());
  const uploaded = await uploadFileToDrive({
    accessToken,
    folderId,
    filename: `${recordedDate}-${planExerciseId}.mp4`,
    mimeType: video.type || "video/mp4",
    buffer,
  });

  const supabase = getSupabaseServerClient();
  const { data: recording, error } = await supabase
    .from("exercise_recordings")
    .insert({
      plan_exercise_id: planExerciseId,
      recorded_date: recordedDate,
      drive_file_id: uploaded.id,
      drive_view_link: uploaded.webViewLink,
    })
    .select()
    .single();

  if (error || !recording) {
    return NextResponse.json({ error: error?.message || "Failed to save recording." }, { status: 500 });
  }

  return NextResponse.json({ recording }, { status: 201 });
}
