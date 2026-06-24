import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE } from "@/lib/appAuth";
import { isSameOrigin } from "@/lib/appRequest";
import { ensurePlanDocumentTable } from "@/lib/ensurePlanTable";

export const dynamic = "force-dynamic";

// Developer-only: wipe an institution's Phase 0 so it can start over. Clears the
// saved answers, status, and submission, removes any uploaded plan documents,
// and clears the finalized standards signal so the manager can fill it again.
// Destructive and intentional.
export async function POST(req: NextRequest) {
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
        { error: "Only AALB staff can reset Phase 0." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const orgId = typeof body?.orgId === "string" ? body.orgId : "";
    if (!orgId) {
      return NextResponse.json({ error: "Missing organization." }, { status: 400 });
    }

    await withDbRetry("portal.phase0.reset", () =>
      prisma.organization.update({
        where: { id: orgId },
        data: {
          phase0Status: "not_started",
          phase0Answers: {},
          phase0SubmittedAt: null,
          standardsAlignedAt: null,
        },
      })
    );

    // Remove any uploaded plan documents. Tolerate the table being absent (a
    // migration not yet applied) so the reset still succeeds.
    try {
      await ensurePlanDocumentTable();
      await prisma.planDocument.deleteMany({ where: { organizationId: orgId } });
    } catch (e) {
      console.error("[portal] phase0 reset: plan-doc delete skipped:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("portal phase0 reset error:", e);
    const connectivity = isConnectivityError(e);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Could not reset Phase 0.",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
