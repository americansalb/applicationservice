import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE } from "@/lib/appAuth";
import { isSameOrigin } from "@/lib/appRequest";
import { sanitizePhase0Config } from "@/lib/phase0Config";

export const dynamic = "force-dynamic";

// Set what AALB already knows about an institution: sector, care setting,
// federal funding, states, languages, and metros. Developer-only. This seeds the
// manager's Phase 0 questionnaire so they confirm and adjust instead of starting
// cold. It writes only Organization.phase0Config, never the manager's answers.
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }
    const session = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    if (session.role !== "DEVELOPER") {
      return NextResponse.json(
        { error: "Only AALB staff can pre-configure an institution." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const config = sanitizePhase0Config(body?.config);

    await withDbRetry("portal.org.preconfigure", () =>
      prisma.organization.update({
        where: { id: params.id },
        data: { phase0Config: config as Prisma.InputJsonObject },
      })
    );

    return NextResponse.json({ ok: true, config });
  } catch (e) {
    console.error("portal preconfigure error:", e);
    const connectivity = isConnectivityError(e);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Could not save the configuration.",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
