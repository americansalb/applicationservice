import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPartnersPool } from "@/lib/partnersDb";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`reset-password:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const pool = getPartnersPool();

  // Check both admin and partner tables
  const adminRes = await pool.query(
    `SELECT "id" FROM "partners_admin_user" WHERE "email" = $1`,
    [email]
  );
  const partnerRes = await pool.query(
    `SELECT "id" FROM "partners_user" WHERE "email" = $1`,
    [email]
  );

  if (adminRes.rows.length > 0 || partnerRes.rows.length > 0) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO "partners_password_reset" ("id", "email", "token", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [crypto.randomUUID(), email, resetToken, expiresAt]
    );

    const baseUrl = process.env.APP_URL || req.headers.get("origin") || "";
    const resetUrl = `${baseUrl}/partners/reset-password?token=${resetToken}`;

    await sendEmail(
      email,
      "AALB Partner Portal — Password Reset",
      `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #00626F;">Password Reset</h2>
        <p>You requested a password reset for the AALB Partner Intake Portal.</p>
        <p><a href="${resetUrl}" style="display: inline-block; background: #00626F; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a></p>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>`
    );
  }

  return NextResponse.json({
    ok: true,
    message: "If an account with that email exists, a reset link has been sent.",
  });
}
