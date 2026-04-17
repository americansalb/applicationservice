import { NextRequest, NextResponse } from "next/server";
import { getPartnersPool } from "@/lib/partnersDb";
import { verifyDownloadToken } from "@/lib/signedUrl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = new URL(req.url);
  const dlToken = url.searchParams.get("dl");
  if (!dlToken || !verifyDownloadToken(dlToken, params.id)) {
    return NextResponse.json({ error: "Invalid or expired download link" }, { status: 403 });
  }

  const pool = getPartnersPool();
  const res = await pool.query(
    `SELECT "filename", "mimeType", "content" FROM "partners_file" WHERE "id" = $1`,
    [params.id]
  );
  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const file = res.rows[0];

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
