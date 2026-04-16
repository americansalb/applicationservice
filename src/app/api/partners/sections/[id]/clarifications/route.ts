import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getTokenFromRequest } from "@/lib/partnersAuth";
import { getPartnersPool, SECTION_KEYS, SectionKey } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = params.id as SectionKey;
  if (!SECTION_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const body = await req.json();
  const message = (body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const pool = getPartnersPool();
  let organizationId: string;
  let authorName: string | null = null;

  if (token.role === "admin") {
    organizationId = body.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required" }, { status: 400 });
    }
    const admin = await pool.query(
      `SELECT "name" FROM "partners_admin_user" WHERE "id" = $1`,
      [token.id]
    );
    authorName = admin.rows[0]?.name || "AALB Admin";
  } else {
    if (!token.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }
    organizationId = token.organizationId;
    const user = await pool.query(
      `SELECT "name" FROM "partners_user" WHERE "id" = $1`,
      [token.id]
    );
    authorName = user.rows[0]?.name || null;
  }

  await pool.query(
    `INSERT INTO "partners_clarification"
     ("id", "organizationId", "sectionKey", "authorRole", "authorName", "message", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [crypto.randomUUID(), organizationId, key, token.role, authorName, message]
  );

  return NextResponse.json({ ok: true });
}
