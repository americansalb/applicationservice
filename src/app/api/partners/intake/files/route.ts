import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requirePartner } from "@/lib/partnersAuth";
import { getPartnersPool, ALL_ASK_IDS } from "@/lib/partnersDb";
import { validateFileContent } from "@/lib/fileMagic";

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

export async function POST(req: NextRequest) {
  const token = requirePartner(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const askId = formData.get("askId") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!askId || !ALL_ASK_IDS.includes(askId)) {
    return NextResponse.json({ error: "Invalid ask ID" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 25MB)" },
      { status: 400 }
    );
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, DOCX, PNG, or JPG." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateFileContent(buffer, file.type)) {
    return NextResponse.json(
      {
        error: "File content doesn't match its type. The file may be corrupted or misnamed.",
      },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const pool = getPartnersPool();

  // We store askId in the sectionKey column to keep the existing schema.
  await pool.query(
    `INSERT INTO "partners_file"
     ("id", "organizationId", "sectionKey", "filename", "mimeType", "sizeBytes", "content", "uploadedBy", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [id, token.organizationId, askId, file.name, file.type, file.size, buffer, token.id]
  );

  return NextResponse.json({
    id,
    askId,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
  });
}
