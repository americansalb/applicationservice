import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await prisma.job.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
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

  const required = ["title", "department", "location", "type", "description", "requirements"] as const;
  for (const field of required) {
    if (typeof body[field] !== "string" || !(body[field] as string).trim()) {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
    }
  }

  const job = await prisma.job.create({
    data: {
      title: (body.title as string).trim(),
      department: (body.department as string).trim(),
      location: (body.location as string).trim(),
      type: (body.type as string).trim(),
      salary: typeof body.salary === "string" ? body.salary.trim() || null : null,
      description: (body.description as string).trim(),
      requirements: (body.requirements as string).trim(),
      benefits: typeof body.benefits === "string" ? body.benefits.trim() || null : null,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
