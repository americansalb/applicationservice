import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getTokenFromRequest } from "@/lib/partnersAuth";
import { getPartnersPool, ASK_GROUPS } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

function resolveOrg(
  token: ReturnType<typeof getTokenFromRequest>,
  url: URL
): string | null {
  if (!token) return null;
  if (token.role === "admin") {
    return url.searchParams.get("organizationId");
  }
  return token.organizationId || null;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const organizationId = resolveOrg(token, url);
  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 400 }
    );
  }

  const pool = getPartnersPool();

  const orgRes = await pool.query(
    `SELECT "id", "name", "step0CompletedAt" FROM "partners_organization" WHERE "id" = $1`,
    [organizationId]
  );
  if (orgRes.rows.length === 0) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const dataRes = await pool.query(
    `SELECT "formData", "status", "updatedAt" FROM "partners_section_data"
     WHERE "organizationId" = $1 AND "sectionKey" = 'intake'`,
    [organizationId]
  );

  const filesRes = await pool.query(
    `SELECT "id", "sectionKey" as "askId", "filename", "mimeType", "sizeBytes", "createdAt"
     FROM "partners_file"
     WHERE "organizationId" = $1
     ORDER BY "createdAt" DESC`,
    [organizationId]
  );

  const clarificationsRes = await pool.query(
    `SELECT "id", "authorRole", "authorName", "message", "createdAt"
     FROM "partners_clarification"
     WHERE "organizationId" = $1
     ORDER BY "createdAt" ASC`,
    [organizationId]
  );

  return NextResponse.json({
    organization: orgRes.rows[0],
    status: dataRes.rows[0]?.status || "Not Started",
    formData: dataRes.rows[0]?.formData || {},
    files: filesRes.rows,
    clarifications: clarificationsRes.rows,
  });
}

export async function PUT(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token || token.role !== "partner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const formData = body.formData || {};
  const submit = body.submit === true;

  const pool = getPartnersPool();
  const current = await pool.query(
    `SELECT "status" FROM "partners_section_data"
     WHERE "organizationId" = $1 AND "sectionKey" = 'intake'`,
    [token.organizationId]
  );
  const currentStatus = current.rows[0]?.status || "Not Started";

  const editable = ["Not Started", "In Progress", "Needs Clarification"];
  if (!editable.includes(currentStatus)) {
    return NextResponse.json({ error: "Intake is locked" }, { status: 403 });
  }

  if (submit) {
    // Validate required asks have either file or text
    const filesRes = await pool.query(
      `SELECT "sectionKey" AS "askId" FROM "partners_file"
       WHERE "organizationId" = $1`,
      [token.organizationId]
    );
    const uploadedAskIds = new Set(filesRes.rows.map((r) => r.askId));
    const missing = ASK_GROUPS.flatMap((g) => g.asks)
      .filter((a) => a.required)
      .filter(
        (a) =>
          !uploadedAskIds.has(a.id) &&
          !((formData[a.id] || "").trim().length > 0)
      );
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required: ${missing.map((a) => a.id).join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  const newStatus = submit
    ? "Submitted"
    : currentStatus === "Needs Clarification"
    ? "Needs Clarification"
    : "In Progress";

  await pool.query(
    `INSERT INTO "partners_section_data"
     ("id", "organizationId", "sectionKey", "formData", "status", "updatedAt")
     VALUES ($1, $2, 'intake', $3::jsonb, $4, NOW())
     ON CONFLICT ("organizationId", "sectionKey")
     DO UPDATE SET "formData" = $3::jsonb, "status" = $4, "updatedAt" = NOW()`,
    [
      crypto.randomUUID(),
      token.organizationId,
      JSON.stringify(formData),
      newStatus,
    ]
  );

  return NextResponse.json({ ok: true, status: newStatus });
}
