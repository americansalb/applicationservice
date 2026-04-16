import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/partnersAuth";
import { getPartnersPool, SECTION_KEYS, SectionKey } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

// PATCH: set status and optionally post clarification message
// Body: { organizationId, action: "approve" | "clarify", message? }
// params.id is the section key
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = params.id as SectionKey;
  if (!SECTION_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const body = await req.json();
  const { organizationId, action, message } = body;
  if (!organizationId || !["approve", "clarify"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (action === "clarify" && (!message || !message.trim())) {
    return NextResponse.json(
      { error: "Clarification message required" },
      { status: 400 }
    );
  }

  const pool = getPartnersPool();
  const newStatus = action === "approve" ? "Approved" : "Needs Clarification";

  await pool.query(
    `INSERT INTO "partners_section_data"
     ("id", "organizationId", "sectionKey", "formData", "status", "updatedAt")
     VALUES ($1, $2, $3, '{}'::jsonb, $4, NOW())
     ON CONFLICT ("organizationId", "sectionKey")
     DO UPDATE SET "status" = $4, "updatedAt" = NOW()`,
    [crypto.randomUUID(), organizationId, key, newStatus]
  );

  if (action === "clarify") {
    const admin = await pool.query(
      `SELECT "name" FROM "partners_admin_user" WHERE "id" = $1`,
      [token.id]
    );
    await pool.query(
      `INSERT INTO "partners_clarification"
       ("id", "organizationId", "sectionKey", "authorRole", "authorName", "message", "createdAt")
       VALUES ($1, $2, $3, 'admin', $4, $5, NOW())`,
      [
        crypto.randomUUID(),
        organizationId,
        key,
        admin.rows[0]?.name || "AALB Admin",
        message.trim(),
      ]
    );
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
