import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE } from "@/lib/appAuth";
import { isSameOrigin, clientIp } from "@/lib/appRequest";
import { checkRateLimit } from "@/lib/rateLimit";
import { verifyPlanUploadToken } from "@/lib/planUpload";
import { validateFileContent } from "@/lib/fileMagic";
import { ensurePlanDocumentTable } from "@/lib/ensurePlanTable";
import { coerceDocumentKind, documentKindLabel } from "@/lib/documentKinds";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Receive an institution's written language access plan, for AALB's Phase 0
// review. Two ways in, both resolved to an org id we trust: the manager (from
// their session) or a colleague (from a signed, expiring upload link). The file
// is validated by size, declared type, and magic bytes, then stored in the
// database. Mirrors the partners intake file handling.
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_TEXT_CHARS = 100_000; // pasted text, stored as a text/plain document
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const text = form.get("text");
    const token = form.get("token");
    const uploaderNameRaw = form.get("uploaderName");
    const kind = coerceDocumentKind(form.get("kind"));

    // Two ways to provide the document: upload a file, or paste its text (stored
    // as a text/plain document so AALB reviews it the same way).
    const hasFile = file instanceof File;
    const hasText = typeof text === "string" && text.trim().length > 0;
    if (!hasFile && !hasText) {
      return NextResponse.json(
        { error: "No file or text provided." },
        { status: 400 }
      );
    }

    // Resolve the organization either from a signed upload link (a colleague,
    // no login) or from the manager's own session. Never from anything else the
    // client can set.
    let orgId: string | null = null;
    let uploadedVia: "manager" | "link" = "manager";
    let rateKey: string;

    if (typeof token === "string" && token.length > 0) {
      orgId = verifyPlanUploadToken(token);
      if (!orgId) {
        return NextResponse.json(
          { error: "This upload link is invalid or has expired." },
          { status: 403 }
        );
      }
      uploadedVia = "link";
      rateKey = `plan:upload:link:${orgId}:${clientIp(req)}`;
    } else {
      const session = await userFromToken(
        req.cookies.get(SESSION_COOKIE)?.value
      );
      if (!session) {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }
      if (session.role !== "MANAGER" || !session.organizationId) {
        return NextResponse.json(
          { error: "Only an institution manager can upload here." },
          { status: 403 }
        );
      }
      orgId = session.organizationId;
      rateKey = `plan:upload:mgr:${session.id}`;
    }

    const limit = checkRateLimit(rateKey, 30, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    // Build the bytes from either the uploaded file (validated by size, declared
    // type, and magic bytes) or the pasted text (trusted UTF-8 we synthesize).
    let buffer: Buffer<ArrayBuffer>;
    let filename: string;
    let mimeType: string;
    if (hasFile) {
      const f = file as File;
      if (f.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "File too large (max 25MB)." },
          { status: 400 }
        );
      }
      if (!ALLOWED_MIMES.has(f.type)) {
        return NextResponse.json(
          { error: "Unsupported file type. Use PDF, Word, PNG, or JPG." },
          { status: 400 }
        );
      }
      buffer = Buffer.from(await f.arrayBuffer());
      if (!validateFileContent(buffer, f.type)) {
        return NextResponse.json(
          {
            error:
              "File content does not match its type. It may be corrupted or misnamed.",
          },
          { status: 400 }
        );
      }
      filename = f.name.slice(0, 300);
      mimeType = f.type;
    } else {
      const pasted = (text as string).trim().slice(0, MAX_TEXT_CHARS);
      buffer = Buffer.from(pasted, "utf8");
      filename = `${documentKindLabel(kind)} (pasted).txt`;
      mimeType = "text/plain";
    }

    const uploaderName =
      typeof uploaderNameRaw === "string" && uploaderNameRaw.trim().length > 0
        ? uploaderNameRaw.trim().slice(0, 200)
        : null;

    // The token can outlive its organization; confirm the org still exists so
    // the foreign key never fails.
    const org = await withDbRetry("portal.plan.org", () =>
      prisma.organization.findUnique({
        where: { id: orgId as string },
        select: { id: true },
      })
    );
    if (!org) {
      return NextResponse.json(
        { error: "Institution not found." },
        { status: 404 }
      );
    }

    await ensurePlanDocumentTable();
    await withDbRetry("portal.plan.upload", () =>
      prisma.planDocument.create({
        data: {
          organizationId: orgId as string,
          filename,
          mimeType,
          sizeBytes: buffer.length,
          content: buffer,
          uploadedVia,
          uploaderName,
          kind,
        },
        select: { id: true },
      })
    );

    return NextResponse.json({ ok: true, filename });
  } catch (e) {
    console.error("portal phase0 plan upload error:", e);
    const connectivity = isConnectivityError(e);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Could not upload the file.",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
