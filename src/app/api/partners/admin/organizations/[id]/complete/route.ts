import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/partnersAuth";
import { getPartnersPool, SECTION_KEYS } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPartnersPool();

  // Verify all 4 sections are approved
  const approvedRes = await pool.query(
    `SELECT "sectionKey" FROM "partners_section_data"
     WHERE "organizationId" = $1 AND "status" = 'Approved'`,
    [params.id]
  );
  const approvedKeys = new Set(approvedRes.rows.map((r) => r.sectionKey));
  const allApproved = SECTION_KEYS.every((k) => approvedKeys.has(k));
  if (!allApproved) {
    return NextResponse.json(
      { error: "All 4 sections must be approved first" },
      { status: 400 }
    );
  }

  await pool.query(
    `UPDATE "partners_organization" SET "step0CompletedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1`,
    [params.id]
  );
  return NextResponse.json({ ok: true });
}
