import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPartnersPool } from "@/lib/partnersDb";
import { validatePassword } from "@/lib/passwordPolicy";
import { logAudit } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json();
  if (!token || !newPassword) {
    return NextResponse.json({ error: "Token and new password required" }, { status: 400 });
  }

  const policyError = validatePassword(newPassword);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const pool = getPartnersPool();
  const resetRes = await pool.query(
    `SELECT "id", "email", "expiresAt", "used" FROM "partners_password_reset" WHERE "token" = $1`,
    [token]
  );
  if (resetRes.rows.length === 0) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  const reset = resetRes.rows[0];
  if (reset.used) {
    return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
  }
  if (new Date(reset.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This reset link has expired" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  // Update in whichever table the email exists
  const adminUpdate = await pool.query(
    `UPDATE "partners_admin_user" SET "password" = $1 WHERE "email" = $2 RETURNING "id"`,
    [hashed, reset.email]
  );
  const partnerUpdate = await pool.query(
    `UPDATE "partners_user" SET "password" = $1 WHERE "email" = $2 RETURNING "id"`,
    [hashed, reset.email]
  );

  // Mark token as used
  await pool.query(
    `UPDATE "partners_password_reset" SET "used" = true WHERE "id" = $1`,
    [reset.id]
  );

  const userId = adminUpdate.rows[0]?.id || partnerUpdate.rows[0]?.id;
  const role = adminUpdate.rows[0] ? "admin" : "partner";
  await logAudit({
    action: "password_reset",
    userId,
    userRole: role,
    userEmail: reset.email,
  });

  return NextResponse.json({ ok: true });
}
