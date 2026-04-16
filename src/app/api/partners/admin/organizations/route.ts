import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/partnersAuth";
import { getPartnersPool } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPartnersPool();
  const result = await pool.query(
    `SELECT o."id", o."name", o."address", o."contactName", o."contactEmail",
            o."step0CompletedAt", o."createdAt",
            COUNT(DISTINCT s."id") FILTER (WHERE s."status" = 'Approved') AS "approvedCount",
            COUNT(DISTINCT s."id") AS "totalSections"
     FROM "partners_organization" o
     LEFT JOIN "partners_section_data" s ON s."organizationId" = o."id"
     GROUP BY o."id"
     ORDER BY o."createdAt" DESC`
  );

  return NextResponse.json({
    organizations: result.rows.map((r) => ({
      ...r,
      approvedCount: Number(r.approvedCount),
    })),
  });
}

export async function POST(req: NextRequest) {
  const token = requireAdmin(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, address, contactName, contactEmail } = body;
  if (!name) {
    return NextResponse.json({ error: "Organization name required" }, { status: 400 });
  }

  const pool = getPartnersPool();
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO "partners_organization"
     ("id", "name", "address", "contactName", "contactEmail", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [id, name, address || null, contactName || null, contactEmail || null]
  );

  return NextResponse.json({ id });
}
