import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { accessUrl } from "@/lib/site";
import { escapeHtml, generateAccessToken, roundLabel } from "@/lib/interviews";

type TemplateLite = {
  id: string;
  jobId: string | null;
  round: number;
  title: string;
  format: string;
  roleTitle: string | null;
  job?: { title: string } | null;
};

// Lowest-round active interview for a job (the pipeline entry point).
export async function firstRoundForJob(jobId: string) {
  return prisma.interviewTemplate.findFirst({
    where: { jobId, isActive: true },
    orderBy: { round: "asc" },
    include: { job: { select: { title: true } } },
  });
}

// Next active round strictly after `currentRound` for a job.
export async function nextRoundForJob(jobId: string, currentRound: number) {
  return prisma.interviewTemplate.findFirst({
    where: { jobId, isActive: true, round: { gt: currentRound } },
    orderBy: { round: "asc" },
    include: { job: { select: { title: true } } },
  });
}

export async function createAccess(opts: {
  interview: TemplateLite;
  fullName: string;
  email: string;
  phone?: string | null;
  previousAccessId?: string | null;
}) {
  const { interview, fullName, email, phone, previousAccessId } = opts;
  return prisma.interviewAccess.create({
    data: {
      token: generateAccessToken(),
      interviewId: interview.id,
      jobId: interview.jobId,
      round: interview.round,
      fullName,
      email,
      phone: phone || null,
      status: "invited",
      previousAccessId: previousAccessId || null,
    },
  });
}

export async function sendRoundInviteEmail(
  access: { token: string; fullName: string; email: string; round: number },
  interview: TemplateLite,
  opts: { advanced?: boolean } = {}
) {
  const url = accessUrl(access.token);
  const role = interview.roleTitle || interview.job?.title || "";
  const roleLine = role ? ` for the <strong>${escapeHtml(role)}</strong> role` : "";
  const lead = opts.advanced
    ? `Good news — you&apos;ve advanced to the <strong>${escapeHtml(roundLabel(interview.round))}</strong> stage${roleLine}.`
    : `You&apos;ve been invited to the <strong>${escapeHtml(roundLabel(interview.round))}</strong> stage${roleLine}: <strong>${escapeHtml(interview.title)}</strong>.`;
  const action =
    interview.format === "live"
      ? "Use the link below to pick a time for your live interview."
      : "Use the link below to complete your self-paced interview whenever you're ready.";

  await sendEmail(
    access.email,
    `AALB — ${roundLabel(interview.round)}: ${interview.title}`,
    `<p>Hi ${escapeHtml(access.fullName)},</p>
     <p>${lead}</p>
     <p>${action}</p>
     <p style="margin:18px 0;">
       <a href="${url}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none;">Open your interview →</a>
     </p>
     <p style="font-size:12px;color:#666;">Or paste this link into your browser:<br/>${url}</p>
     <p>This link is unique to you — please don&apos;t share it.</p>
     <p>— AALB Hiring Team</p>`
  );
}
