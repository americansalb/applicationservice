import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Host-based split, working by default with no env config:
//   careers.aalb.org  -> the careers job board (served as-is)
//   everything else   -> the evaluation platform (testing.aalb.org, preview
//                        hosts, localhost) which lands on /portal/login.
// Both hosts can be overridden via CAREERS_HOST / PORTAL_HOST if they change.
const CAREERS_HOST = (process.env.CAREERS_HOST || "careers.aalb.org").toLowerCase();
const PORTAL_HOST = (process.env.PORTAL_HOST || "testing.aalb.org").toLowerCase();

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
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname } = req.nextUrl;

  if (host === CAREERS_HOST) {
    // Careers job board: serve as-is, but keep the portal off this host.
    if (pathname === "/portal" || pathname.startsWith("/portal/")) {
      return NextResponse.redirect(
        `https://${PORTAL_HOST}${pathname}${req.nextUrl.search}`
      );
    }
    return NextResponse.next();
  }

  // Portal host (and any other host): serve only the platform.
  if (isPlatformOrInfra(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/portal/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
