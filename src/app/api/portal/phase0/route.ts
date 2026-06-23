import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE } from "@/lib/appAuth";
import { isSameOrigin } from "@/lib/appRequest";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  sanitizeAnswers,
  missingRequiredIds,
  type Phase0Answers,
} from "@/lib/phase0";

export const dynamic = "force-dynamic";

// Save (and optionally submit) an institution's Phase 0 questionnaire. The
// MANAGER fills this out for their own organization. The org is taken from the
// session, never the request body or URL, so a manager can only ever write to
// their own institution. Editable only while not_started or in_progress; once
// submitted it is locked pending AALB review.
export async function PUT(req: NextRequest) {
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
    if (session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Only an institution manager can complete Phase 0." },
        { status: 403 }
      );
    }
    const orgId = session.organizationId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Your account is not linked to an institution yet." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const submit = body?.submit === true;
    const answers: Phase0Answers = sanitizeAnswers(body?.answers);

    // Strict cap on submit (a deliberate, infrequent action); a generous,
    // separate cap on autosave so frequent drafts never trip the strict limit.
    const limit = submit
      ? checkRateLimit(`phase0:submit:${session.id}`)
      : checkRateLimit(`phase0:draft:${session.id}`, 600, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const org = await withDbRetry("portal.phase0.load", () =>
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, phase0Status: true },
      })
    );
    if (!org) {
      return NextResponse.json(
        { error: "Institution not found." },
        { status: 404 }
      );
    }
    if (org.phase0Status === "submitted" || org.phase0Status === "finalized") {
      return NextResponse.json(
        {
          error:
            "Your standards have already been submitted and are locked pending AALB review.",
          status: org.phase0Status,
        },
        { status: 409 }
      );
    }

    if (submit) {
      const missing = missingRequiredIds(answers, { orgName: org.name });
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: "A few required answers are still missing.",
            missing,
          },
          { status: 400 }
        );
      }
      const updated = await withDbRetry("portal.phase0.submit", () =>
        prisma.organization.update({
          where: { id: orgId },
          data: {
            phase0Answers: answers as Prisma.InputJsonObject,
            phase0Status: "submitted",
            phase0SubmittedAt: new Date(),
          },
          select: { phase0Status: true, phase0SubmittedAt: true },
        })
      );
      return NextResponse.json({ ok: true, ...updated });
    }

    // Draft autosave: advance not_started to in_progress, otherwise leave the
    // status as-is.
    const nextStatus =
      org.phase0Status === "not_started" ? "in_progress" : org.phase0Status;
    const updated = await withDbRetry("portal.phase0.save", () =>
      prisma.organization.update({
        where: { id: orgId },
        data: {
          phase0Answers: answers as Prisma.InputJsonObject,
          phase0Status: nextStatus,
        },
        select: { phase0Status: true },
      })
    );
    return NextResponse.json({ ok: true, ...updated });
  } catch (e) {
    console.error("portal phase0 save error:", e);
    const connectivity = isConnectivityError(e);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Could not save your answers.",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
