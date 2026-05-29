import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadVideoToDrive } from "@/lib/googleDrive";
import { sendEmail } from "@/lib/email";
import {
  MAX_VIDEO_BYTES,
  escapeHtml,
  roundLabel,
  type InterviewQuestion,
} from "@/lib/interviews";

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
  if (access.status !== "invited") {
    return NextResponse.json(
      { error: "You've already submitted this round." },
      { status: 409 }
    );
  }

  const tpl = access.interview;
  const questions = (tpl.questions as unknown as InterviewQuestion[]) || [];

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

  const answers: Record<string, string> = {};
  const videoUrls: Record<string, { fileId: string; webViewLink: string }> = {};

  for (const q of questions) {
    const text = String(form.get(`answer_${q.id}`) || "").trim();
    if (text) answers[q.id] = text;

    const file = form.get(`video_${q.id}`);
    const hasVideo = file && file instanceof File && file.size > 0;

    if (tpl.videoRequired && !hasVideo) {
      return NextResponse.json(
        { error: "A video answer is required for every question." },
        { status: 400 }
      );
    }
    if (hasVideo) {
      const f = file as File;
      if (f.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: `Video for "${q.prompt.slice(0, 40)}…" exceeds 200 MB limit` },
          { status: 413 }
        );
      }
      const buffer = Buffer.from(await f.arrayBuffer());
      const safeName = fullName.replace(/[^a-zA-Z0-9_-]+/g, "_");
      const ext = f.name.split(".").pop() || "webm";
      try {
        videoUrls[q.id] = await uploadVideoToDrive({
          filename: `${tpl.slug}_${safeName}_${q.id}_${Date.now()}.${ext}`,
          mimeType: f.type || "video/webm",
          buffer,
        });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Drive upload failed" },
          { status: 500 }
        );
      }
    }
  }

  if (Object.keys(answers).length === 0 && Object.keys(videoUrls).length === 0) {
    return NextResponse.json(
      { error: "Please answer at least one question before submitting." },
      { status: 400 }
    );
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
        data: { status: "submitted", submissionId: submission.id },
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
