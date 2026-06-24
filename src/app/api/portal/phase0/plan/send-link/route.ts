import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE } from "@/lib/appAuth";
import { isSameOrigin, baseUrl } from "@/lib/appRequest";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  createPlanUploadToken,
  planUploadUrl,
  PLAN_UPLOAD_TTL_DAYS,
} from "@/lib/planUpload";
import { planUploadEmailHtml, planUploadEmailText } from "@/lib/invitations";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Email a colleague (the compliance owner, say) a token-gated link to upload the
// institution's language access plan, so the manager does not have to have the
// file on hand. Manager-only; the org is taken from the session, never the body.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
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
    if (session.role !== "MANAGER" || !session.organizationId) {
      return NextResponse.json(
        { error: "Only an institution manager can send this." },
        { status: 403 }
      );
    }

    const limit = checkRateLimit(`plan:sendlink:${session.id}`, 20, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const org = await withDbRetry("portal.plan.sendlink.org", () =>
      prisma.organization.findUnique({
        where: { id: session.organizationId as string },
        select: { name: true },
      })
    );
    if (!org) {
      return NextResponse.json(
        { error: "Institution not found." },
        { status: 404 }
      );
    }

    const token = createPlanUploadToken(session.organizationId);
    const url = planUploadUrl(baseUrl(req), token);
    const opts = {
      orgName: org.name,
      url,
      inviterName: session.name,
      ttlDays: PLAN_UPLOAD_TTL_DAYS,
    };

    await sendEmail(
      email,
      `Upload ${org.name}'s language access plan`,
      planUploadEmailHtml(opts),
      { text: planUploadEmailText(opts) }
    );

    return NextResponse.json({ ok: true, email });
  } catch (e) {
    console.error("portal phase0 plan send-link error:", e);
    const connectivity = isConnectivityError(e);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Could not send the upload link.",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
