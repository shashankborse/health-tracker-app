import { NextRequest, NextResponse } from "next/server";
import { getDriveAuthUrl } from "@/lib/googleDrive";

const STATE_COOKIE = "gd_oauth_state";

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getDriveAuthUrl(state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
