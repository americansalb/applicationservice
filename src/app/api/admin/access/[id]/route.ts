import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { accessUrl } from "@/lib/site";
import { roundLabel } from "@/lib/interviews";
import { createAccess, nextRoundForJob, sendRoundInviteEmail } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = String(body.action || "");

  const access = await prisma.interviewAccess
    .findUnique({ where: { id: params.id } })
    .catch(() => null);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "decline") {
    await prisma.interviewAccess.update({
      where: { id: access.id },
      data: { status: "declined" },
    });
    return NextResponse.json({ ok: true, status: "declined" });
  }

  if (action === "advance") {
    if (access.status === "advanced") {
      return NextResponse.json({ error: "Already advanced." }, { status: 409 });
    }
    if (access.status === "declined") {
      return NextResponse.json(
        { error: "This candidate was declined. Re-open before advancing." },
        { status: 409 }
      );
    }
    if (!access.jobId) {
      return NextResponse.json(
        { error: "This interview isn't part of a job pipeline." },
        { status: 400 }
      );
    }

    const next = await nextRoundForJob(access.jobId, access.round);

    // Mark this round advanced regardless.
    await prisma.interviewAccess.update({
      where: { id: access.id },
      data: { status: "advanced" },
    });

    if (!next) {
      return NextResponse.json({ ok: true, final: true });
    }

    const nextAccess = await createAccess({
      interview: next,
      fullName: access.fullName,
      email: access.email,
      phone: access.phone,
      previousAccessId: access.id,
    });

    let emailed = true;
    try {
      await sendRoundInviteEmail(nextAccess, next, { advanced: true });
    } catch (e) {
      emailed = false;
      console.error("Advance email failed:", e);
    }

    return NextResponse.json({
      ok: true,
      next: {
        id: nextAccess.id,
        round: next.round,
        roundLabel: roundLabel(next.round),
        title: next.title,
        format: next.format,
        url: accessUrl(nextAccess.token),
      },
      emailed,
    });
  }

  if (action === "reopen") {
    await prisma.interviewAccess.update({
      where: { id: access.id },
      data: { status: access.submissionId || access.bookedSlot ? "submitted" : "invited" },
    });
    return NextResponse.json({ ok: true, status: "reopened" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
