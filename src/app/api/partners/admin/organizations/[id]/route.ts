import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/partnersAuth";
import { getPartnersPool, SECTION_KEYS, SECTION_META } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPartnersPool();
  const orgRes = await pool.query(
    `SELECT "id", "name", "address", "contactName", "contactEmail", "step0CompletedAt", "createdAt"
     FROM "partners_organization" WHERE "id" = $1`,
    [params.id]
  );
  if (orgRes.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sectionsRes = await pool.query(
    `SELECT "sectionKey", "status", "updatedAt" FROM "partners_section_data" WHERE "organizationId" = $1`,
    [params.id]
  );
  const byKey = new Map<string, { status: string; updatedAt: string }>(
    sectionsRes.rows.map((r) => [r.sectionKey, r])
  );

  const sections = SECTION_KEYS.map((key) => {
    const meta = SECTION_META[key];
    const row = byKey.get(key);
    return {
      key,
      number: meta.number,
      title: meta.title,
      description: meta.description,
      status: row?.status || "Not Started",
      updatedAt: row?.updatedAt || null,
    };
  });

  const usersRes = await pool.query(
    `SELECT "id", "email", "name", "createdAt" FROM "partners_user" WHERE "organizationId" = $1`,
    [params.id]
  );

  return NextResponse.json({
    organization: orgRes.rows[0],
    sections,
    users: usersRes.rows,
  });
}
