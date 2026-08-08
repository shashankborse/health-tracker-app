import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Paths that must stay reachable without a valid session. /privacy and
// /terms specifically need to be readable by Google's OAuth verification
// reviewers, who won't have (and shouldn't need) the app password. "/" is
// the OAuth-verification "home page" — it explains the app and forwards
// signed-in visitors to /home itself, so it must not redirect to /login.
// /api/keep-alive, /api/google-health/sync, and /api/backup/run are hit by
// Vercel Cron (see vercel.json), which never carries the session cookie —
// without this exemption they silently redirect to /login instead of ever
// running, which is exactly what was happening to keep-alive before this
// fix. /api/backup/run additionally checks CRON_SECRET itself, since it
// touches every table — being in this allowlist only exempts it from the
// session-cookie check, not from that in-route check.
const PUBLIC_PATHS = ["/login", "/api/login", "/privacy", "/terms", "/api/keep-alive", "/api/google-health/sync", "/api/backup/run"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/" ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Run on every route except static assets, so the whole app is gated.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)"],
};
