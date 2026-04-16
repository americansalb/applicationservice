import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requirePartner } from "@/lib/partnersAuth";
import { getPartnersPool, SECTION_KEYS, SectionKey } from "@/lib/partnersDb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = requirePartner(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = params.id as SectionKey;
  if (!SECTION_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, DOCX, PNG, or JPG." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const pool = getPartnersPool();

  await pool.query(
    `INSERT INTO "partners_file"
     ("id", "organizationId", "sectionKey", "filename", "mimeType", "sizeBytes", "content", "uploadedBy", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [id, token.organizationId, key, file.name, file.type, file.size, buffer, token.id]
  );

  return NextResponse.json({
    id,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
  });
}
