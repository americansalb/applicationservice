import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { accessUrl } from "@/lib/site";
import { createAccess, firstRoundForJob, sendRoundInviteEmail } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

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

  const jobId = String(body.jobId || "").trim();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;

  if (!jobId || !fullName || !email) {
    return NextResponse.json(
      { error: "Job, full name, and email are required" },
      { status: 400 }
    );
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const existing = await prisma.interviewAccess.findFirst({
      where: { jobId, email: { equals: email, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This candidate is already in this pipeline." },
        { status: 409 }
      );
    }

    const round1 = await firstRoundForJob(jobId);
    if (!round1) {
      return NextResponse.json(
        { error: "This job has no active rounds yet. Create Round 1 first." },
        { status: 400 }
      );
    }

    const access = await createAccess({
      interview: round1,
      fullName,
      email,
      phone,
    });

    let emailed = true;
    try {
      await sendRoundInviteEmail(access, round1);
    } catch (e) {
      emailed = false;
      console.error("Invite email failed:", e);
    }

    return NextResponse.json(
      { id: access.id, url: accessUrl(access.token), emailed },
      { status: 201 }
    );
  } catch (e) {
    console.error("Invite error:", e);
    return NextResponse.json({ error: "Invite failed" }, { status: 500 });
  }
}
