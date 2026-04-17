import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getTokenFromRequest } from "@/lib/partnersAuth";
import { getPartnersPool } from "@/lib/partnersDb";
import { validatePassword } from "@/lib/passwordPolicy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password required" }, { status: 400 });
  }

  const policyError = validatePassword(newPassword);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const pool = getPartnersPool();
  const table = token.role === "admin" ? "partners_admin_user" : "partners_user";
  const userRes = await pool.query(
    `SELECT "password" FROM "${table}" WHERE "id" = $1`,
    [token.id]
  );
  if (userRes.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, userRes.rows[0].password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await pool.query(`UPDATE "${table}" SET "password" = $1 WHERE "id" = $2`, [hashed, token.id]);

  return NextResponse.json({ ok: true });
}
