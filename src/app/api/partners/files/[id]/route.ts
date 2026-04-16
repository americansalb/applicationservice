import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/partnersAuth";
import { getPartnersPool } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Accept token from header OR query string (for direct browser downloads)
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  let token = getTokenFromRequest(req);
  if (!token && queryToken) {
    const { verifyPartnerToken } = await import("@/lib/partnersAuth");
    token = verifyPartnerToken(queryToken);
  }
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPartnersPool();
  const res = await pool.query(
    `SELECT "organizationId", "filename", "mimeType", "content" FROM "partners_file" WHERE "id" = $1`,
    [params.id]
  );
  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const file = res.rows[0];

  // Scope: admins can view any file; partners only their own org's files
  if (token.role === "partner" && file.organizationId !== token.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = new Uint8Array(file.content);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
      "Content-Length": String(body.length),
    },
  });
}
