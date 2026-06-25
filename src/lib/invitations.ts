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

// Brand palette (kept in sync with the portal UI).
const TEAL_950 = "#04302e";
const TEAL_BTN = "#0f4c47";
const TEAL_200 = "#9fd9d0";
const INK = "#20251f";
const INK_SOFT = "#41483f";
const INK_MUTED = "#6b7280";
const INK_FAINT = "#9a9588";
const SAND = "#f4f4f5";
const HAIRLINE = "#e4e4e7";

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_SERIF = "Georgia,'Times New Roman',Times,serif";

type InviteEmailOpts = {
  // Developers (AALB staff) have no organization, so this is optional.
  orgName?: string;
  roleLabel: string;
  url: string;
  inviterName?: string;
};

// A beautiful, email-client-safe invitation email: table-based layout, inline
// styles only, web-safe fonts, ~600px wide. The header is a typographic
// wordmark (no hosted image) so it always renders — email clients block
// remote images by default, which would otherwise show a broken logo.
export function inviteEmailHtml(opts: InviteEmailOpts): string {
  const { orgName, roleLabel, url, inviterName } = opts;
  const org = orgName ? escapeHtml(orgName) : "";
  const role = escapeHtml(roleLabel);
  const safeUrl = escapeAttr(url);
  const intro = inviterName
    ? `${escapeHtml(inviterName)} has invited you`
    : "You've been invited";
  const year = new Date().getFullYear();
  const inviteLine = orgName
    ? `${intro} to join <strong style="color:${INK};">${org}</strong> on the AALB Evaluation Platform as a <strong style="color:${INK};">${role}</strong>.`
    : `${intro} to join the AALB Evaluation Platform as a <strong style="color:${INK};">${role}</strong>.`;
  const preheader = orgName
    ? `${intro} to join ${org} as a ${role} on the AALB Evaluation Platform.`
    : `${intro} to join the AALB Evaluation Platform as a ${role}.`;

  const header = `<div style="font-family:${FONT_SERIF};font-size:30px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;line-height:1;">AALB</div>
              <div style="font-family:${FONT_SANS};font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:${TEAL_200};margin-top:9px;">Evaluation Platform</div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<title>Your AALB Evaluation Platform invitation</title>
</head>
<body style="margin:0;padding:0;background:${SAND};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SAND};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:${TEAL_950};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
              ${header}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;">
              <h1 style="margin:0 0 18px;font-family:${FONT_SERIF};font-size:25px;line-height:1.25;color:${INK};font-weight:600;">You're invited</h1>
              <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${INK_SOFT};">
                ${inviteLine}
              </p>
              <p style="margin:0 0 30px;font-family:${FONT_SANS};font-size:15px;line-height:1.65;color:${INK_MUTED};">
                Set your password to activate your account and get started.
              </p>
              <!-- Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${TEAL_BTN}" style="border-radius:10px;">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${FONT_SANS};font-size:16px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">Accept invitation &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:30px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${INK_FAINT};">
                This invitation is single-use and expires in ${INVITE_TTL_DAYS} days. If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:8px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;word-break:break-all;">
                <a href="${safeUrl}" target="_blank" style="color:${TEAL_BTN};text-decoration:underline;">${escapeHtml(url)}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;border-top:1px solid ${HAIRLINE};padding:24px 40px 28px;">
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${INK_FAINT};">
                You're receiving this because someone invited you to the AALB Evaluation Platform. If you weren't expecting it, you can safely ignore this email.
              </p>
              <p style="margin:12px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:#b8b3a6;">
                &copy; ${year} Americans Against Language Barriers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Plain-text alternative — improves deliverability and renders in clients that
// don't show HTML.
export function inviteEmailText(opts: InviteEmailOpts): string {
  const { orgName, roleLabel, url, inviterName } = opts;
  const intro = inviterName
    ? `${inviterName} has invited you`
    : "You've been invited";
  const joinLine = orgName
    ? `${intro} to join ${orgName} as a ${roleLabel}.`
    : `${intro} to join the AALB Evaluation Platform as a ${roleLabel}.`;
  return [
    "AALB Evaluation Platform",
    "",
    joinLine,
    "",
    "Set your password to activate your account:",
    url,
    "",
    `This invitation is single-use and expires in ${INVITE_TTL_DAYS} days.`,
    "If you weren't expecting this, you can ignore this email.",
    "",
    `© ${new Date().getFullYear()} Americans Against Language Barriers`,
  ].join("\n");
}

type PlanUploadEmailOpts = {
  orgName: string;
  url: string;
  // The manager who sent the link (so a colleague knows who asked).
  inviterName?: string;
  // How long the link stays valid, in days (kept in sync with planUpload.ts).
  ttlDays: number;
  // Lower-case noun for the document being requested (documentKinds.ts), e.g.
  // "interpreter job description". Defaults to the language access plan.
  docLabel?: string;
};

// The email that carries a token-gated link for uploading an institution's
// language access plan. Same email-client-safe construction as the invitation:
// table layout, inline styles, typographic wordmark (no remote image).
export function planUploadEmailHtml(opts: PlanUploadEmailOpts): string {
  const { orgName, url, inviterName, ttlDays } = opts;
  const docLabel = opts.docLabel ?? "language access policies";
  const docLabelEsc = escapeHtml(docLabel);
  const org = escapeHtml(orgName);
  const safeUrl = escapeAttr(url);
  const intro = inviterName
    ? `${escapeHtml(inviterName)} has asked you to share`
    : "You have been asked to share";
  const year = new Date().getFullYear();
  const line = `${intro} <strong style="color:${INK};">${org}</strong>'s ${docLabelEsc} with AALB, as part of your standards review. It takes one upload.`;
  const preheader = `${intro} ${orgName}'s ${docLabel} with AALB.`;

  const header = `<div style="font-family:${FONT_SERIF};font-size:30px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;line-height:1;">AALB</div>
              <div style="font-family:${FONT_SANS};font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:${TEAL_200};margin-top:9px;">Evaluation Platform</div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<title>Upload your ${docLabelEsc}</title>
</head>
<body style="margin:0;padding:0;background:${SAND};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SAND};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td style="background:${TEAL_950};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
              ${header}
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;">
              <h1 style="margin:0 0 18px;font-family:${FONT_SERIF};font-size:25px;line-height:1.25;color:${INK};font-weight:600;">Upload your ${docLabelEsc}</h1>
              <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${INK_SOFT};">
                ${line}
              </p>
              <p style="margin:0 0 30px;font-family:${FONT_SANS};font-size:15px;line-height:1.65;color:${INK_MUTED};">
                No account or sign in needed. PDF, Word, or an image is fine.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${TEAL_BTN}" style="border-radius:10px;">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${FONT_SANS};font-size:16px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">Upload policies &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:30px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${INK_FAINT};">
                This link expires in ${ttlDays} days. If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:8px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;word-break:break-all;">
                <a href="${safeUrl}" target="_blank" style="color:${TEAL_BTN};text-decoration:underline;">${escapeHtml(url)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;border-top:1px solid ${HAIRLINE};padding:24px 40px 28px;">
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${INK_FAINT};">
                You're receiving this because someone at ${org} asked you to upload their ${docLabelEsc}. If you weren't expecting it, you can safely ignore this email.
              </p>
              <p style="margin:12px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:#b8b3a6;">
                &copy; ${year} Americans Against Language Barriers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function planUploadEmailText(opts: PlanUploadEmailOpts): string {
  const { orgName, url, inviterName, ttlDays } = opts;
  const docLabel = opts.docLabel ?? "language access policies";
  const intro = inviterName
    ? `${inviterName} has asked you to share`
    : "You have been asked to share";
  return [
    "AALB Evaluation Platform",
    "",
    `${intro} ${orgName}'s ${docLabel} with AALB.`,
    "",
    "Upload it here (no account or sign in needed):",
    url,
    "",
    `This link expires in ${ttlDays} days.`,
    "If you weren't expecting this, you can ignore this email.",
    "",
    `© ${new Date().getFullYear()} Americans Against Language Barriers`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// For values placed inside HTML attributes (href/src).
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
