import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, GOOGLE_HEALTH_SCOPES } from "@/lib/googleHealth";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const STATE_COOKIE = "gh_oauth_state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const error = request.nextUrl.searchParams.get("error");

  const healthUrl = new URL("/health", request.url);

  if (error) {
    healthUrl.searchParams.set("error", error);
    return NextResponse.redirect(healthUrl);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    healthUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(healthUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Happens if the user has connected before without revoking access —
      // Google only issues a refresh_token on the first consent. Since
      // access_type=offline + prompt=consent are both set, this shouldn't
      // occur in normal use, but fail loudly rather than silently storing
      // an unusable connection.
      healthUrl.searchParams.set("error", "no_refresh_token");
      return NextResponse.redirect(healthUrl);
    }

    const supabase = getSupabaseServerClient();
    await supabase.from("google_health_connection").upsert({
      id: "default",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope || GOOGLE_HEALTH_SCOPES,
      connected_at: new Date().toISOString(),
      backfill_status: "not_started",
    });

    healthUrl.searchParams.set("connected", "1");
  } catch {
    healthUrl.searchParams.set("error", "token_exchange_failed");
  }

  const response = NextResponse.redirect(healthUrl);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
