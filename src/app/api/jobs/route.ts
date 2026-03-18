import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const jobs = await prisma.job.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(jobs);
}
