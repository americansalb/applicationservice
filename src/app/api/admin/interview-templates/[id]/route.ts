import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { normalizeQuestions, normalizeInterviewConfig } from "@/lib/interviews";
import { normalizeLiveConfig } from "@/lib/liveSlots";

export const dynamic = "force-dynamic";

function authed(req: NextRequest): boolean {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  return !!token && !!verifyToken(token);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!authed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.InterviewTemplateUpdateInput = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    data.title = t;
  }
  if (body.round !== undefined) {
    const n = Number(body.round);
    if (Number.isFinite(n) && n >= 1) data.round = Math.floor(n);
  }
  if (body.intro !== undefined) {
    data.intro =
      typeof body.intro === "string" && body.intro.trim() ? body.intro.trim() : null;
  }
  if (body.roleTitle !== undefined) {
    data.roleTitle =
      typeof body.roleTitle === "string" && body.roleTitle.trim()
        ? body.roleTitle.trim()
        : null;
  }
  if (body.jobId !== undefined) {
    const jid =
      typeof body.jobId === "string" && body.jobId.trim() ? body.jobId.trim() : null;
    data.job = jid ? { connect: { id: jid } } : { disconnect: true };
  }
  if (body.videoRequired !== undefined) {
    data.videoRequired = body.videoRequired === true;
  }
  if (body.isActive !== undefined) {
    data.isActive = body.isActive === true;
  }
  if (body.format !== undefined) {
    data.format = body.format === "live" ? "live" : "self_paced";
  }
  if (body.liveConfig !== undefined) {
    const cfg = normalizeLiveConfig(body.liveConfig);
    if (data.format === "live" && cfg.slots.length === 0) {
      return NextResponse.json(
        { error: "Add at least one time slot for a live round." },
        { status: 400 }
      );
    }
    data.liveConfig = cfg;
  }
  if (body.questions !== undefined) {
    try {
      data.questions = normalizeQuestions(body.questions);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid questions" },
        { status: 400 }
      );
    }
  }
  if (body.config !== undefined) {
    // Live rounds don't carry capture config; clear it if switching to live.
    data.config =
      data.format === "live" ? Prisma.DbNull : normalizeInterviewConfig(body.config);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.interviewTemplate.update({
      where: { id: params.id },
      data,
      include: {
        job: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Update interview template error:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!authed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.interviewTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Delete interview template error:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
