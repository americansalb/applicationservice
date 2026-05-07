import { NextRequest, NextResponse } from "next/server";
import { getPool, resetPool } from "@/lib/pg";
import { isConnectivityError, withDbRetry } from "@/lib/dbRetry";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await withDbRetry(
      "admin.virtualInterviewRequests.GET",
      () =>
        getPool().query(
          `SELECT "id", "jobSlug", "fullName", "email", "phone", "notes", "contactedAt", "createdAt"
           FROM "careers_virtual_interview_request"
           ORDER BY "contactedAt" NULLS FIRST, "createdAt" DESC`
        ),
      () => resetPool()
    );
    return NextResponse.json(result.rows);
  } catch (e) {
    console.error("List virtual requests error:", e);
    if (isConnectivityError(e)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
