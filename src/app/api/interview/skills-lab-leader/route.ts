import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadVideoToDrive } from "@/lib/googleDrive";
import { sendEmail } from "@/lib/email";
import {
  COMPETENCY_QUESTIONS,
  SKILLS_LAB_LEADER_SLUG,
} from "@/lib/skillsLabLeader";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB per video

export async function POST(req: NextRequest) {
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

  const answers: Record<string, string> = {};
  const videoUrls: Record<string, { fileId: string; webViewLink: string }> = {};

  for (const q of COMPETENCY_QUESTIONS) {
    const text = String(form.get(`answer_${q.id}`) || "").trim();
    if (text) answers[q.id] = text;

    const file = form.get(`video_${q.id}`);
    if (file && file instanceof File && file.size > 0) {
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: `Video for ${q.id} exceeds 200 MB limit` },
          { status: 413 }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = fullName.replace(/[^a-zA-Z0-9_-]+/g, "_");
      const ext = file.name.split(".").pop() || "webm";
      try {
        const result = await uploadVideoToDrive({
          filename: `${safeName}_${q.id}_${Date.now()}.${ext}`,
          mimeType: file.type || "video/webm",
          buffer,
        });
        videoUrls[q.id] = result;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Drive upload failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  const submission = await prisma.interviewSubmission.create({
    data: {
      jobSlug: SKILLS_LAB_LEADER_SLUG,
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

  try {
    await sendEmail(
      email,
      "AALB Skills Lab Leader — Round 2 Interview Received",
      `<p>Hi ${escapeHtml(fullName)},</p>
       <p>Thanks for completing the round 2 video interview for the <strong>Skills Lab Leader</strong> role. We've received your submission and will be in touch shortly.</p>
       <p>If you're based in Mexico City and haven't already, please use the booking link in your invitation email to schedule your in-person interview between May 7 and May 9.</p>
       <p>— AALB Hiring Team</p>`
    );
  } catch (e) {
    console.error("Failed to send confirmation email:", e);
  }

  return NextResponse.json({ id: submission.id, ok: true }, { status: 201 });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
