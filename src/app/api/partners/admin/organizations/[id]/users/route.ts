import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/partnersAuth";
import { getPartnersPool } from "@/lib/partnersDb";
import { validatePassword } from "@/lib/passwordPolicy";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { email, password, name } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  const policyError = validatePassword(password);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const pool = getPartnersPool();
  const orgCheck = await pool.query(
    `SELECT "id" FROM "partners_organization" WHERE "id" = $1`,
    [params.id]
  );
  if (orgCheck.rows.length === 0) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO "partners_user" ("id", "email", "password", "name", "organizationId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, email, hashed, name || null, params.id]
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create user";
    if (message.includes("unique")) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ id, email });
}
