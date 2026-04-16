import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/partnersAuth";
import { getPartnersPool } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  const token = requirePartner(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPartnersPool();
  const res = await pool.query(
    `DELETE FROM "partners_file"
     WHERE "id" = $1 AND "organizationId" = $2 AND "sectionKey" = $3
     RETURNING "id"`,
    [params.fileId, token.organizationId, params.id]
  );

  if (res.rowCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
