import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { InterviewQuestion } from "@/lib/interviews";

export const dynamic = "force-dynamic";

// Public: returns the configuration a candidate needs to take the interview.
// The slug is unguessable and acts as the invitation token — no PII or
// submissions are ever returned here.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  let template;
  try {
    template = await prisma.interviewTemplate.findUnique({
      where: { slug: params.slug },
      include: { job: { select: { title: true } } },
    });
  } catch (e) {
    console.error("Failed to load interview:", e);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  if (!template || !template.isActive) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const questions = (template.questions as unknown as InterviewQuestion[]) || [];
  const roleTitle = template.roleTitle || template.job?.title || null;

  return NextResponse.json({
    slug: template.slug,
    title: template.title,
    round: template.round,
    roleTitle,
    intro: template.intro,
    videoRequired: template.videoRequired,
    questions,
  });
}
