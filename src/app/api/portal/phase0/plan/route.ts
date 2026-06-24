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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Receive an institution's written language access plan, for AALB's Phase 0
// review. Two ways in, both resolved to an org id we trust: the manager (from
// their session) or a colleague (from a signed, expiring upload link). The file
// is validated by size, declared type, and magic bytes, then stored in the
// database. Mirrors the partners intake file handling.
const MAX_BYTES = 25 * 1024 * 1024;
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
    const token = form.get("token");
    const uploaderNameRaw = form.get("uploaderName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
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

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 25MB)." },
        { status: 400 }
      );
    }
    if (!ALLOWED_MIMES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, Word, PNG, or JPG." },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileContent(buffer, file.type)) {
      return NextResponse.json(
        {
          error:
            "File content does not match its type. It may be corrupted or misnamed.",
        },
        { status: 400 }
      );
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
          filename: file.name.slice(0, 300),
          mimeType: file.type,
          sizeBytes: file.size,
          content: buffer,
          uploadedVia,
          uploaderName,
        },
        select: { id: true },
      })
    );

    return NextResponse.json({ ok: true, filename: file.name });
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
