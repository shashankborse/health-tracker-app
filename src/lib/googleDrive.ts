import { getSupabaseServerClient } from "./supabaseServer";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

// Narrow scope: this app can only see/manage files it itself creates in
// Drive, never any other file in the user's account. Kept as its own OAuth
// grant, separate from the Health scopes — see googleHealth.ts's comment
// on GOOGLE_HEALTH_SCOPES for why they can't share one token.
export const GOOGLE_DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.file";

function config() {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GOOGLE_HEALTH_CLIENT_ID/SECRET/GOOGLE_DRIVE_REDIRECT_URI are not set."
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function getDriveAuthUrl(state: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_DRIVE_SCOPES,
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

export async function exchangeDriveCodeForTokens(code: string): Promise<TokenResponse> {
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
    throw new Error(`Drive token exchange failed: ${await res.text()}`);
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
    throw new Error(`Drive token refresh failed: ${await res.text()}`);
  }
  return res.json();
}

/** Returns a valid Drive access token, transparently refreshing if expired. */
export async function getValidDriveAccessToken(): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data: connection, error } = await supabase
    .from("google_drive_connection")
    .select("*")
    .eq("id", "default")
    .single();

  if (error || !connection) {
    throw new Error("Google Drive is not connected.");
  }

  const expiresAt = new Date(connection.token_expires_at).getTime();
  const bufferMs = 60_000;
  if (Date.now() < expiresAt - bufferMs) {
    return connection.access_token;
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabase
    .from("google_drive_connection")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: newExpiresAt,
      ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
    })
    .eq("id", "default");

  return refreshed.access_token;
}

/**
 * Finds a folder by name among files this app has access to (drive.file
 * scope only ever sees files it created, so this is always scoped to our
 * own folders), creating it if it doesn't exist yet.
 */
export async function getOrCreateFolder(accessToken: string, name: string): Promise<string> {
  const query = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const listRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) {
    throw new Error(`Drive folder lookup failed: ${await listRes.text()}`);
  }
  const listBody = await listRes.json();
  if (listBody.files?.length > 0) {
    return listBody.files[0].id;
  }

  const createRes = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!createRes.ok) {
    throw new Error(`Drive folder creation failed: ${await createRes.text()}`);
  }
  const createBody = await createRes.json();
  return createBody.id;
}

/** Uploads a file into a Drive folder, returning its id and view link. */
export async function uploadFileToDrive({
  accessToken,
  folderId,
  filename,
  mimeType,
  buffer,
}: {
  accessToken: string;
  folderId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ id: string; webViewLink: string }> {
  const boundary = `drive-upload-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });

  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`,
    "utf-8"
  );
  const closing = Buffer.from(`\r\n--${boundary}--`, "utf-8");
  const body = Buffer.concat([preamble, buffer, closing]);

  const res = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,webViewLink`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Drive upload failed: ${await res.text()}`);
  }
  return res.json();
}
