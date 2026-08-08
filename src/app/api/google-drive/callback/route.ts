import { NextRequest, NextResponse } from "next/server";
import { exchangeDriveCodeForTokens, GOOGLE_DRIVE_SCOPES } from "@/lib/googleDrive";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const STATE_COOKIE = "gd_oauth_state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const error = request.nextUrl.searchParams.get("error");

  const healthUrl = new URL("/health", request.url);

  if (error) {
    healthUrl.searchParams.set("drive_error", error);
    return NextResponse.redirect(healthUrl);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    healthUrl.searchParams.set("drive_error", "invalid_state");
    return NextResponse.redirect(healthUrl);
  }

  try {
    const tokens = await exchangeDriveCodeForTokens(code);
    if (!tokens.refresh_token) {
      healthUrl.searchParams.set("drive_error", "no_refresh_token");
      return NextResponse.redirect(healthUrl);
    }

    const supabase = getSupabaseServerClient();
    await supabase.from("google_drive_connection").upsert({
      id: "default",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope || GOOGLE_DRIVE_SCOPES,
      connected_at: new Date().toISOString(),
    });

    healthUrl.searchParams.set("drive_connected", "1");
  } catch {
    healthUrl.searchParams.set("drive_error", "token_exchange_failed");
  }

  const response = NextResponse.redirect(healthUrl);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
