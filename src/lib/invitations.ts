import { randomBytes } from "crypto";

export const INVITE_TTL_DAYS = 14;

export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function inviteUrl(base: string, token: string): string {
  return `${base.replace(/\/+$/, "")}/portal/invite/${token}`;
}

export function isEmailConfigured(): boolean {
  return !!(
    (process.env.EMAIL_SERVICE &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASSWORD) ||
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY
  );
}

export function inviteEmailHtml(opts: {
  orgName: string;
  roleLabel: string;
  url: string;
  inviterName?: string;
}): string {
  const { orgName, roleLabel, url, inviterName } = opts;
  const intro = inviterName
    ? `${escapeHtml(inviterName)} has invited you`
    : "You have been invited";
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#241F1A">
    <div style="background:#042f2e;color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
      <div style="font-size:20px;font-weight:700;letter-spacing:-0.01em">AALB</div>
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#5eead4">Evaluation Platform</div>
    </div>
    <div style="border:1px solid #EAE0D0;border-top:none;border-radius:0 0 12px 12px;padding:28px">
      <p style="font-size:16px;margin:0 0 12px">${intro} to join <strong>${escapeHtml(
        orgName
      )}</strong> as a <strong>${escapeHtml(roleLabel)}</strong>.</p>
      <p style="font-size:14px;line-height:1.6;color:#5A5147;margin:0 0 24px">
        Click below to set your password and access your account. This link is
        single-use and expires in ${INVITE_TTL_DAYS} days.
      </p>
      <a href="${url}" style="display:inline-block;background:#134e4a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px">Accept invitation</a>
      <p style="font-size:12px;color:#8C8273;margin:24px 0 0;word-break:break-all">Or paste this link: ${url}</p>
    </div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
