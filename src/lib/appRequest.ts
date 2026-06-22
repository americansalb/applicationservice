import type { NextRequest } from "next/server";

// Best-effort client IP (behind Render's proxy).
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// CSRF defense-in-depth on top of the SameSite=Lax session cookie: reject a
// state-changing request whose Origin is a different site. Requests without an
// Origin header (server-to-server, curl, some same-origin navigations) are
// allowed, so this never blocks legitimate non-browser callers.
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
