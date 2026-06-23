import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE } from "@/lib/appAuth";
import { isSameOrigin } from "@/lib/appRequest";

export const dynamic = "force-dynamic";

// Mark an institution's Phase 0 / standards alignment complete (or revert it).
// Developer-only: this is AALB staff confirming the institutional standards are
// in place, which unlocks Step 1 for that institution's interpreters.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const session = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    if (session.role !== "DEVELOPER") {
      return NextResponse.json(
        { error: "Only AALB staff can change standards status." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const aligned = body?.aligned === true;

    await withDbRetry("portal.org.standards", () =>
      prisma.organization.update({
        where: { id: params.id },
        data: { standardsAlignedAt: aligned ? new Date() : null },
      })
    );

    return NextResponse.json({ ok: true, aligned });
  } catch (e) {
    console.error("portal standards update error:", e);
    const connectivity = isConnectivityError(e);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Could not update standards status.",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
