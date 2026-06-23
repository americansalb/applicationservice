import nodemailer from "nodemailer";

type SendOpts = {
  // Plain-text alternative part (improves deliverability and renders in
  // clients that don't show HTML).
  text?: string;
  replyTo?: string;
};

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  opts: SendOpts = {}
) {
  const from =
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER ||
    "AALB Evaluation Platform <noreply@aalb.org>";
  const { text, replyTo } = opts;

  // Option 1: SMTP via nodemailer (EMAIL_SERVICE + EMAIL_USER + EMAIL_PASSWORD)
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    await transporter.sendMail({ from, to, subject, html, text, replyTo });
    return;
  }

  // Option 2: Resend API
  if (process.env.RESEND_API_KEY) {
    const payload: Record<string, unknown> = { from, to: [to], subject, html };
    if (text) payload.text = text;
    if (replyTo) payload.reply_to = replyTo;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
    }
    return;
  }

  // Option 3: SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    const content: { type: string; value: string }[] = [];
    if (text) content.push({ type: "text/plain", value: text });
    content.push({ type: "text/html", value: html });
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content,
      }),
    });
    if (!res.ok) {
      throw new Error(`SendGrid failed (${res.status}): ${await res.text()}`);
    }
    return;
  }

  console.log(`[email] No email service configured. Would send to ${to}: ${subject}`);
}
