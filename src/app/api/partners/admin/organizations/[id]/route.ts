import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/partnersAuth";
import { getPartnersPool } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPartnersPool();
  const orgRes = await pool.query(
    `SELECT "id", "name", "address", "contactName", "contactEmail",
            "step0CompletedAt", "createdAt"
     FROM "partners_organization" WHERE "id" = $1`,
    [params.id]
  );
  if (orgRes.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const usersRes = await pool.query(
    `SELECT "id", "email", "name", "createdAt"
     FROM "partners_user" WHERE "organizationId" = $1`,
    [params.id]
  );

  return NextResponse.json({
    organization: orgRes.rows[0],
    users: usersRes.rows,
  });
}
