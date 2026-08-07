import { getSupabaseServerClient } from "./supabaseServer";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Confirmed against the live Google Health API discovery document
// (https://health.googleapis.com/$discovery/rest?version=v4) rather than
// guessed — this API is too new to assume anything about.
export const GOOGLE_HEALTH_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
].join(" ");

function config() {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GOOGLE_HEALTH_CLIENT_ID/SECRET/REDIRECT_URI are not set.");
  }
  return { clientId, clientSecret, redirectUri };
}

export function getAuthUrl(state: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_HEALTH_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = config();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${await res.text()}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = config();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }
  return res.json();
}

/** Returns a valid access token, transparently refreshing if it's expired. */
export async function getValidAccessToken(): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data: connection, error } = await supabase
    .from("google_health_connection")
    .select("*")
    .eq("id", "default")
    .single();

  if (error || !connection) {
    throw new Error("Google Health is not connected.");
  }

  const expiresAt = new Date(connection.token_expires_at).getTime();
  const bufferMs = 60_000; // refresh a minute early to avoid edge-of-expiry failures
  if (Date.now() < expiresAt - bufferMs) {
    return connection.access_token;
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabase
    .from("google_health_connection")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: newExpiresAt,
      // Google only returns a new refresh_token occasionally; keep the old one otherwise.
      ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
    })
    .eq("id", "default");

  return refreshed.access_token;
}
