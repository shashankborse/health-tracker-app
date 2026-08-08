import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getValidDriveAccessToken } from "@/lib/googleDrive";

// Proxies the video content straight from Drive rather than linking out to
// Drive's own viewer, so it plays natively in-app via a plain <video> tag.
// No Range-request support — full-file proxy, adequate for short clips.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { data: recording } = await supabase
    .from("exercise_recordings")
    .select("drive_file_id")
    .eq("id", id)
    .maybeSingle();

  if (!recording) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidDriveAccessToken();
  } catch {
    return NextResponse.json({ error: "Google Drive is not connected." }, { status: 400 });
  }

  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${recording.drive_file_id}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!driveRes.ok || !driveRes.body) {
    return NextResponse.json({ error: "Couldn't fetch video from Drive." }, { status: 502 });
  }

  const headers = new Headers({ "Content-Type": "video/mp4" });
  const contentLength = driveRes.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(driveRes.body, { headers });
}
