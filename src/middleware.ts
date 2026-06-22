import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The legacy careers + partners app is retained in the codebase and database,
// but is no longer publicly accessible: the public is sent to the new portal.
// It is not deleted, just hidden. Set LEGACY_ENABLED=true to serve it again
// (e.g. temporary internal access or a rollback) without any code change.
const LEGACY_ENABLED = process.env.LEGACY_ENABLED === "true";

// The new platform plus framework/infra paths that must always resolve.
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
  if (LEGACY_ENABLED) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPlatformOrInfra(pathname)) return NextResponse.next();

  // Legacy API: return 404 rather than redirect an API client to an HTML page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Everything else is the legacy site: send the public to the new portal.
  const url = req.nextUrl.clone();
  url.pathname = "/portal/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
