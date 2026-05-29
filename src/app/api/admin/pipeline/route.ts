import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Admin: the progression board — job pipelines (ordered rounds) and every
// candidate's access rows across rounds.
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rounds, accesses] = await Promise.all([
      prisma.interviewTemplate.findMany({
        where: { jobId: { not: null } },
        orderBy: [{ jobId: "asc" }, { round: "asc" }],
        select: {
          id: true,
          title: true,
          round: true,
          format: true,
          isActive: true,
          jobId: true,
          job: { select: { id: true, title: true } },
        },
      }),
      prisma.interviewAccess.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          token: true,
          interviewId: true,
          jobId: true,
          round: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          submissionId: true,
          bookedSlot: true,
          createdAt: true,
          updatedAt: true,
          interview: { select: { title: true, format: true } },
        },
      }),
    ]);

    return NextResponse.json({ rounds, accesses });
  } catch (e) {
    console.error("Pipeline load error:", e);
    return NextResponse.json(
      { error: "Service temporarily unavailable." },
      { status: 503 }
    );
  }
}
