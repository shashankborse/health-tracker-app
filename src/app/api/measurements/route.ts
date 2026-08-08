import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getValidDriveAccessToken, getOrCreateFolder, uploadFileToDrive } from "@/lib/googleDrive";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_FIELDS = ["arm_cm", "chest_cm", "waist_cm", "hip_cm", "thigh_cm"] as const;
const POSES = ["front", "side", "back"] as const;
const DRIVE_FOLDER_NAME = "Health Tracker Progress Photos";

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const weekDate = formData.get("week_date");
  if (typeof weekDate !== "string" || !DATE_RE.test(weekDate)) {
    return NextResponse.json({ error: "week_date must be YYYY-MM-DD." }, { status: 400 });
  }

  const measurements: Record<string, number | null> = {};
  for (const field of NUMERIC_FIELDS) {
    const raw = formData.get(field);
    if (raw === null || raw === "") {
      measurements[field] = null;
      continue;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0 || num > 300) {
      return NextResponse.json({ error: `${field} must be a positive number.` }, { status: 400 });
    }
    measurements[field] = num;
  }

  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null;

  const photoFiles: { pose: string; file: File }[] = [];
  for (const pose of POSES) {
    const file = formData.get(pose);
    if (file instanceof File && file.size > 0) {
      photoFiles.push({ pose, file });
    }
  }
  if (photoFiles.length === 0) {
    return NextResponse.json({ error: "At least one progress photo is required." }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidDriveAccessToken();
  } catch {
    return NextResponse.json({ error: "Connect Google Drive first." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: weekRow, error: upsertError } = await supabase
    .from("weekly_measurements")
    .upsert({ week_date: weekDate, ...measurements, notes }, { onConflict: "week_date" })
    .select()
    .single();

  if (upsertError || !weekRow) {
    return NextResponse.json({ error: upsertError?.message || "Failed to save measurements." }, { status: 500 });
  }

  const folderId = await getOrCreateFolder(accessToken, DRIVE_FOLDER_NAME);

  for (const { pose, file } of photoFiles) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${weekDate}-${pose}${file.name ? `-${file.name}` : ""}`;
    const uploaded = await uploadFileToDrive({
      accessToken,
      folderId,
      filename,
      mimeType: file.type || "image/jpeg",
      buffer,
    });
    await supabase.from("progress_photos").insert({
      weekly_measurement_id: weekRow.id,
      pose,
      drive_file_id: uploaded.id,
      drive_view_link: uploaded.webViewLink,
    });
  }

  return NextResponse.json({ entry: weekRow }, { status: 201 });
}
