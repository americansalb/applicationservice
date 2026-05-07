import { NextRequest, NextResponse } from "next/server";
import { getPool, resetPool } from "@/lib/pg";
import { isConnectivityError, withDbRetry } from "@/lib/dbRetry";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const markContacted = body.contacted === true;

  try {
    const result = await withDbRetry(
      "admin.virtualInterviewRequests.PATCH",
      () =>
        getPool().query(
          `UPDATE "careers_virtual_interview_request"
           SET "contactedAt" = $1
           WHERE "id" = $2`,
          [markContacted ? new Date() : null, params.id]
        ),
      () => resetPool()
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update virtual request error:", e);
    if (isConnectivityError(e)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await withDbRetry(
      "admin.virtualInterviewRequests.DELETE",
      () =>
        getPool().query(
          `DELETE FROM "careers_virtual_interview_request" WHERE "id" = $1`,
          [params.id]
        ),
      () => resetPool()
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete virtual request error:", e);
    if (isConnectivityError(e)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
