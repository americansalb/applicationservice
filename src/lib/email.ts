import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, html: string) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@aalb.org";

  // Option 1: SMTP via nodemailer (EMAIL_SERVICE + EMAIL_USER + EMAIL_PASSWORD)
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    await transporter.sendMail({ from, to, subject, html });
    return;
  }

  // Option 2: Resend API
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);
    return;
  }

  // Option 3: SendGrid API
  if (process.env.SENDGRID_API_KEY) {
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
        content: [{ type: "text/html", value: html }],
      }),
    });
    if (!res.ok) throw new Error(`SendGrid failed: ${await res.text()}`);
    return;
  }

  console.log(`[email] No email service configured. Would send to ${to}: ${subject}`);
}
