import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/partnersAuth";
import { getPartnersPool } from "@/lib/partnersDb";
import { createDownloadToken } from "@/lib/signedUrl";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPartnersPool();
  const res = await pool.query(
    `SELECT "organizationId" FROM "partners_file" WHERE "id" = $1`,
    [params.id]
  );
  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (token.role === "partner" && res.rows[0].organizationId !== token.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const downloadToken = createDownloadToken(params.id);
  return NextResponse.json({ downloadToken });
}
