import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { InterviewQuestion } from "@/lib/interviews";
import { normalizeLiveConfig } from "@/lib/liveSlots";

export const dynamic = "force-dynamic";

// Public: resolves a per-candidate access token to the round they can take.
// The token gates the round — no token, no access.
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  let access;
  try {
    access = await prisma.interviewAccess.findUnique({
      where: { token: params.token },
      include: {
        interview: { include: { job: { select: { title: true } } } },
      },
    });
  } catch (e) {
    console.error("Failed to load access:", e);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  if (!access || !access.interview || !access.interview.isActive) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const tpl = access.interview;
  const roleTitle = tpl.roleTitle || tpl.job?.title || null;
  const isLive = tpl.format === "live";

  const base = {
    token: access.token,
    status: access.status,
    round: tpl.round,
    title: tpl.title,
    intro: tpl.intro,
    roleTitle,
    format: tpl.format,
    candidate: {
      fullName: access.fullName,
      email: access.email,
      phone: access.phone,
    },
  };

  if (access.status === "declined") {
    return NextResponse.json({ ...base, closed: true });
  }

  if (isLive) {
    const cfg = normalizeLiveConfig(tpl.liveConfig);
    // Which slots are already taken by other candidates for this round.
    const taken = await prisma.interviewAccess.findMany({
      where: { interviewId: tpl.id, bookedSlot: { not: null } },
      select: { bookedSlot: true },
    });
    const takenSet = new Set(
      taken
        .map((t) => t.bookedSlot?.toISOString())
        .filter((s): s is string => !!s)
    );
    const myBooking = access.bookedSlot?.toISOString() || null;
    return NextResponse.json({
      ...base,
      live: {
        timeZone: cfg.timeZone,
        durationMins: cfg.durationMins,
        locationLabel: cfg.locationLabel,
        slots: cfg.slots.map((iso) => ({
          iso,
          taken: takenSet.has(iso) && iso !== myBooking,
        })),
      },
      bookedSlot: myBooking,
      done: !!myBooking,
    });
  }

  // Self-paced round.
  const questions = (tpl.questions as unknown as InterviewQuestion[]) || [];
  return NextResponse.json({
    ...base,
    videoRequired: tpl.videoRequired,
    questions,
    done: access.status !== "invited",
  });
}
