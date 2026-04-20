import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/partnersAuth";
import { getPartnersPool } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

// PATCH: admin approves or requests clarification on the consolidated intake
// Body: { action: "approve" | "clarify", message? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  const token = requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, message } = body;
  if (!["approve", "clarify"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
     VALUES ($1, $2, 'intake', '{}'::jsonb, $3, NOW())
     ON CONFLICT ("organizationId", "sectionKey")
     DO UPDATE SET "status" = $3, "updatedAt" = NOW()`,
    [crypto.randomUUID(), params.organizationId, newStatus]
  );

  if (action === "clarify") {
    const admin = await pool.query(
      `SELECT "name" FROM "partners_admin_user" WHERE "id" = $1`,
      [token.id]
    );
    await pool.query(
      `INSERT INTO "partners_clarification"
       ("id", "organizationId", "sectionKey", "authorRole", "authorName", "message", "createdAt")
       VALUES ($1, $2, 'intake', 'admin', $3, $4, NOW())`,
      [
        crypto.randomUUID(),
        params.organizationId,
        admin.rows[0]?.name || "AALB Admin",
        message.trim(),
      ]
    );
  }

  if (action === "approve") {
    await pool.query(
      `UPDATE "partners_organization"
       SET "step0CompletedAt" = NOW(), "updatedAt" = NOW()
       WHERE "id" = $1`,
      [params.organizationId]
    );
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
