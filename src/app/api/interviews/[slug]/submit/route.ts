import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  escapeHtml,
  roundLabel,
  normalizeQuestions,
  normalizeInterviewConfig,
  type InterviewQuestion,
} from "@/lib/interviews";
import { collectInterviewAnswers, SubmitError } from "@/lib/interviewSubmit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const template = await prisma.interviewTemplate
    .findUnique({
      where: { slug: params.slug },
      include: { job: { select: { title: true } } },
    })
    .catch(() => null);

  if (!template || !template.isActive) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  let questions: InterviewQuestion[];
  try {
    questions = normalizeQuestions(template.questions ?? []);
  } catch {
    questions = [];
  }
  const config = normalizeInterviewConfig(template.config);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const fullName = String(form.get("fullName") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const location = String(form.get("location") || "").trim() || null;
  const linkedIn = String(form.get("linkedIn") || "").trim() || null;
  const yearsExp = String(form.get("yearsExp") || "").trim() || null;

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { error: "Full name, email, and phone are required" },
      { status: 400 }
    );
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  let answers: Record<string, string>;
  let videoUrls: Record<string, { fileId: string; webViewLink: string }>;
  try {
    ({ answers, videoUrls } = await collectInterviewAnswers(form, questions, {
      videoRequired: template.videoRequired,
      captureMode: config.captureMode,
      slug: template.slug,
      fullName,
    }));
  } catch (e) {
    if (e instanceof SubmitError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let submission;
  try {
    submission = await prisma.interviewSubmission.create({
      data: {
        jobSlug: template.slug,
        interviewId: template.id,
        round: template.round,
        fullName,
        email,
        phone,
        location,
        linkedIn,
        yearsExp,
        answers,
        videoUrls,
      },
    });
  } catch (e) {
    console.error("Failed to save interview submission:", e);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  const roleTitle = template.roleTitle || template.job?.title || "";
  const roleLine = roleTitle ? ` for the <strong>${escapeHtml(roleTitle)}</strong> role` : "";
  try {
    await sendEmail(
      email,
      `AALB ${roundLabel(template.round)} Interview Received`,
      `<p>Hi ${escapeHtml(fullName)},</p>
       <p>Thanks for completing your <strong>${escapeHtml(roundLabel(template.round))}</strong> self-paced interview${roleLine}. We&apos;ve received your submission and the hiring team will be in touch with next steps.</p>
       <p>— AALB Hiring Team</p>`
    );
  } catch (e) {
    console.error("Failed to send confirmation email:", e);
  }

  return NextResponse.json({ id: submission.id, ok: true }, { status: 201 });
}
