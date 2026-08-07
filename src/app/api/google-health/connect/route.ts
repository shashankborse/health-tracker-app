import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/googleHealth";

const STATE_COOKIE = "gh_oauth_state";

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getAuthUrl(state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes is plenty for the consent screen round-trip
  });
  return response;
}
