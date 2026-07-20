import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, firstName, lastName, email, phone } = body;

    if (!jobId || !firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Allow-list applicant-editable fields only. Never spread the raw request
    // body into prisma.create: server-controlled columns (status, timestamps)
    // must not be settable by the client (mass-assignment). Optional fields are
    // coerced to a trimmed string or dropped.
    const str = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : undefined;

    const application = await prisma.application.create({
      data: {
        jobId,
        firstName,
        lastName,
        email,
        phone,
        address: str(body.address),
        city: str(body.city),
        state: str(body.state),
        zipCode: str(body.zipCode),
        resumeText: str(body.resumeText),
        coverLetter: str(body.coverLetter),
        linkedIn: str(body.linkedIn),
        portfolio: str(body.portfolio),
        yearsExp: str(body.yearsExp),
        startDate: str(body.startDate),
        referral: str(body.referral),
        legallyAuth: str(body.legallyAuth),
        additionalInfo: str(body.additionalInfo),
        // status intentionally omitted — defaults to "New" server-side.
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error("Application error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true, department: true } } },
  });

  return NextResponse.json(applications);
}
