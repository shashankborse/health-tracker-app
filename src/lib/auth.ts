import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.APP_PASSWORD;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET (or APP_PASSWORD) environment variable is not set."
    );
  }
  return secret;
}

/** Builds the signed cookie value proving a successful login. */
export function createSessionToken(): string {
  const secret = getSecret();
  return createHmac("sha256", secret).update("authenticated").digest("hex");
}

/** Verifies a session token from the cookie against the expected value. */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const expected = createSessionToken();
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Checks a submitted password against the single shared app password. */
export function checkPassword(candidate: string): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(appPassword);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_COOKIE_MAX_AGE = ONE_YEAR_SECONDS;
