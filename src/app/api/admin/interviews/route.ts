import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await prisma.interviewSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      interview: { select: { id: true, title: true, round: true } },
    },
  });
  return NextResponse.json(submissions);
}
