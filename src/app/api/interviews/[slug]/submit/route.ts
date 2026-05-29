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

  const questions =
    (template.questions as unknown as InterviewQuestion[]) || [];

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

  const answers: Record<string, string> = {};
  const videoUrls: Record<string, { fileId: string; webViewLink: string }> = {};

  for (const q of questions) {
    const text = String(form.get(`answer_${q.id}`) || "").trim();
    if (text) answers[q.id] = text;

    const file = form.get(`video_${q.id}`);
    const hasVideo = file && file instanceof File && file.size > 0;

    if (template.videoRequired && !hasVideo) {
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
      const arrayBuffer = await f.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = fullName.replace(/[^a-zA-Z0-9_-]+/g, "_");
      const ext = f.name.split(".").pop() || "webm";
      try {
        const result = await uploadVideoToDrive({
          filename: `${template.slug}_${safeName}_${q.id}_${Date.now()}.${ext}`,
          mimeType: f.type || "video/webm",
          buffer,
        });
        videoUrls[q.id] = result;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Drive upload failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  if (Object.keys(answers).length === 0 && Object.keys(videoUrls).length === 0) {
    return NextResponse.json(
      { error: "Please answer at least one question before submitting." },
      { status: 400 }
    );
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
