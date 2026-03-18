import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalJobs, activeJobs, totalApplications, statusCounts] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { isActive: true } }),
    prisma.application.count(),
    prisma.application.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const recentApplications = await prisma.application.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true } } },
  });

  return NextResponse.json({
    totalJobs,
    activeJobs,
    totalApplications,
    statusCounts: statusCounts.reduce(
      (acc, s) => ({ ...acc, [s.status]: s._count.status }),
      {} as Record<string, number>
    ),
    recentApplications,
  });
}
