import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getTokenFromRequest } from "@/lib/partnersAuth";
import {
  getPartnersPool,
  SECTION_KEYS,
  SECTION_META,
  SectionKey,
} from "@/lib/partnersDb";

export const dynamic = "force-dynamic";

function resolveOrg(token: ReturnType<typeof getTokenFromRequest>, url: URL) {
  if (!token) return null;
  if (token.role === "admin") {
    const orgId = url.searchParams.get("organizationId");
    if (!orgId) return null;
    return orgId;
  }
  return token.organizationId || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = params.id as SectionKey;
  if (!SECTION_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const url = new URL(req.url);
  const organizationId = resolveOrg(token, url);
  if (!organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 400 });
  }

  const pool = getPartnersPool();
  const dataRes = await pool.query(
    `SELECT "formData", "status", "updatedAt" FROM "partners_section_data"
     WHERE "organizationId" = $1 AND "sectionKey" = $2`,
    [organizationId, key]
  );

  const filesRes = await pool.query(
    `SELECT "id", "filename", "mimeType", "sizeBytes", "createdAt"
     FROM "partners_file"
     WHERE "organizationId" = $1 AND "sectionKey" = $2
     ORDER BY "createdAt" DESC`,
    [organizationId, key]
  );

  const clarificationsRes = await pool.query(
    `SELECT "id", "authorRole", "authorName", "message", "createdAt"
     FROM "partners_clarification"
     WHERE "organizationId" = $1 AND "sectionKey" = $2
     ORDER BY "createdAt" ASC`,
    [organizationId, key]
  );

  return NextResponse.json({
    meta: { ...SECTION_META[key], key },
    formData: dataRes.rows[0]?.formData || {},
    status: dataRes.rows[0]?.status || "Not Started",
    updatedAt: dataRes.rows[0]?.updatedAt || null,
    files: filesRes.rows,
    clarifications: clarificationsRes.rows,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  if (!token || token.role !== "partner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = params.id as SectionKey;
  if (!SECTION_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const body = await req.json();
  const formData = body.formData || {};
  const submit = body.submit === true;

  const pool = getPartnersPool();

  // Check current status — if Submitted, Approved, or Under Review, reject edits
  const current = await pool.query(
    `SELECT "status" FROM "partners_section_data"
     WHERE "organizationId" = $1 AND "sectionKey" = $2`,
    [token.organizationId, key]
  );
  const currentStatus = current.rows[0]?.status || "Not Started";

  // Only allow edits when Not Started, In Progress, or Needs Clarification
  const editable = ["Not Started", "In Progress", "Needs Clarification"];
  if (!editable.includes(currentStatus)) {
    return NextResponse.json(
      { error: "Section is locked" },
      { status: 403 }
    );
  }

  let newStatus: string;
  if (submit) {
    newStatus = "Submitted";
  } else if (currentStatus === "Needs Clarification") {
    newStatus = "Needs Clarification";
  } else {
    newStatus = "In Progress";
  }

  await pool.query(
    `INSERT INTO "partners_section_data"
     ("id", "organizationId", "sectionKey", "formData", "status", "updatedAt")
     VALUES ($1, $2, $3, $4::jsonb, $5, NOW())
     ON CONFLICT ("organizationId", "sectionKey")
     DO UPDATE SET "formData" = $4::jsonb, "status" = $5, "updatedAt" = NOW()`,
    [
      crypto.randomUUID(),
      token.organizationId,
      key,
      JSON.stringify(formData),
      newStatus,
    ]
  );

  return NextResponse.json({ ok: true, status: newStatus });
}
