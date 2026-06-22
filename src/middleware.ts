import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The new evaluation platform is served on its OWN host (e.g. testing.aalb.org),
// configured via PORTAL_HOST. The careers job board (careers.aalb.org) and any
// other host keep working exactly as before.
//
// Safe default: if PORTAL_HOST is unset, this middleware is a no-op, so nothing
// is gated and the existing site is untouched.
const PORTAL_HOST = (process.env.PORTAL_HOST || "").toLowerCase();

// The platform plus framework/infra paths that must always resolve.
function isPlatformOrInfra(pathname: string): boolean {
  return (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname.startsWith("/api/portal") ||
    pathname === "/api/healthz" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/.well-known")
  );
}

export function middleware(req: NextRequest) {
  if (!PORTAL_HOST) return NextResponse.next();

  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname } = req.nextUrl;

  if (host === PORTAL_HOST) {
    // Portal domain: serve only the platform; keep the legacy site off it.
    if (isPlatformOrInfra(pathname)) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/portal/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Any other host (careers, etc.): leave the existing site untouched, but send
  // the portal routes to the portal domain so the two stay cleanly separated.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return NextResponse.redirect(
      `https://${PORTAL_HOST}${pathname}${req.nextUrl.search}`
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
