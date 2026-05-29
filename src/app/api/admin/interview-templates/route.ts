import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { generateInterviewSlug, normalizeQuestions } from "@/lib/interviews";
import { normalizeLiveConfig } from "@/lib/liveSlots";

export const dynamic = "force-dynamic";

function authed(req: NextRequest): boolean {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  return !!token && !!verifyToken(token);
}

export async function GET(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await prisma.interviewTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        job: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
      },
    });
    return NextResponse.json(templates);
  } catch (e) {
    console.error("List interview templates error:", e);
    return NextResponse.json(
      { error: "Service temporarily unavailable." },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const roundNum = Number(body.round);
  const round = Number.isFinite(roundNum) && roundNum >= 1 ? Math.floor(roundNum) : 1;

  const format = body.format === "live" ? "live" : "self_paced";

  // Live rounds carry scheduling slots instead of questions.
  let questions: { id: string; prompt: string }[] = [];
  let liveConfig = null;
  if (format === "live") {
    liveConfig = normalizeLiveConfig(body.liveConfig);
    if (liveConfig.slots.length === 0) {
      return NextResponse.json(
        { error: "Add at least one time slot for a live round." },
        { status: 400 }
      );
    }
  } else {
    try {
      questions = normalizeQuestions(body.questions);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid questions" },
        { status: 400 }
      );
    }
  }

  const jobId =
    typeof body.jobId === "string" && body.jobId.trim() ? body.jobId.trim() : null;
  const roleTitle =
    typeof body.roleTitle === "string" && body.roleTitle.trim()
      ? body.roleTitle.trim()
      : null;
  const intro =
    typeof body.intro === "string" && body.intro.trim() ? body.intro.trim() : null;
  const videoRequired = body.videoRequired === true;
  const isActive = body.isActive === undefined ? true : body.isActive === true;

  try {
    const created = await prisma.interviewTemplate.create({
      data: {
        slug: generateInterviewSlug(title),
        title,
        round,
        format,
        liveConfig: liveConfig === null ? undefined : liveConfig,
        jobId,
        roleTitle,
        intro,
        videoRequired,
        isActive,
        questions,
      },
      include: {
        job: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("Create interview template error:", e);
    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 }
    );
  }
}
