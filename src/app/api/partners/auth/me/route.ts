import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/partnersAuth";
import { getPartnersPool } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPartnersPool();

  if (token.role === "admin") {
    const res = await pool.query(
      `SELECT "id", "email", "name" FROM "partners_admin_user" WHERE "id" = $1`,
      [token.id]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ role: "admin", user: res.rows[0] });
  }

  const res = await pool.query(
    `SELECT u."id", u."email", u."name", u."organizationId",
            o."name" AS "organizationName"
     FROM "partners_user" u
     JOIN "partners_organization" o ON o."id" = u."organizationId"
     WHERE u."id" = $1`,
    [token.id]
  );
  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ role: "partner", user: res.rows[0] });
}
