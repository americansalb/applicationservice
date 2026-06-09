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
  { params }: { params: { token: string } }
) {
  const access = await prisma.interviewAccess
    .findUnique({
      where: { token: params.token },
      include: { interview: { include: { job: { select: { title: true } } } } },
    })
    .catch(() => null);

  if (!access || !access.interview || !access.interview.isActive) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }
  if (access.interview.format === "live") {
    return NextResponse.json({ error: "This round is a live interview." }, { status: 400 });
  }

  const tpl = access.interview;
  const config = normalizeInterviewConfig(tpl.config);
  // Allow re-submission until the candidate has used all their allowed attempts.
  if (access.attemptsUsed >= config.maxSubmissions) {
    return NextResponse.json(
      {
        error:
          config.maxSubmissions === 1
            ? "You've already submitted this round."
            : "You've used all of your submission attempts for this round.",
      },
      { status: 409 }
    );
  }

  let questions: InterviewQuestion[];
  try {
    questions = normalizeQuestions(tpl.questions ?? []);
  } catch {
    questions = [];
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // Identity comes from the invitation; allow optional extra context.
  const fullName = access.fullName;
  const email = access.email;
  const phone = access.phone || String(form.get("phone") || "").trim();
  const location = String(form.get("location") || "").trim() || null;
  const linkedIn = String(form.get("linkedIn") || "").trim() || null;
  const yearsExp = String(form.get("yearsExp") || "").trim() || null;

  let answers: Record<string, string>;
  let videoUrls: Record<string, { fileId: string; webViewLink: string }>;
  try {
    ({ answers, videoUrls } = await collectInterviewAnswers(form, questions, {
      videoRequired: tpl.videoRequired,
      captureMode: config.captureMode,
      slug: tpl.slug,
      fullName,
    }));
  } catch (e) {
    if (e instanceof SubmitError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let submissionId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const submission = await tx.interviewSubmission.create({
        data: {
          jobSlug: tpl.slug,
          interviewId: tpl.id,
          round: tpl.round,
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
      await tx.interviewAccess.update({
        where: { id: access.id },
        data: {
          status: "submitted",
          submissionId: submission.id,
          attemptsUsed: { increment: 1 },
        },
      });
      return submission;
    });
    submissionId = result.id;
  } catch (e) {
    console.error("Failed to save gated submission:", e);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  try {
    await sendEmail(
      email,
      `AALB — ${roundLabel(tpl.round)} received`,
      `<p>Hi ${escapeHtml(fullName)},</p>
       <p>Thanks for completing <strong>${escapeHtml(tpl.title)}</strong> (${escapeHtml(roundLabel(tpl.round))}). The hiring team will review your responses and let you know about next steps.</p>
       <p>— AALB Hiring Team</p>`
    );
  } catch (e) {
    console.error("Failed to send confirmation email:", e);
  }

  return NextResponse.json({ id: submissionId, ok: true }, { status: 201 });
}
