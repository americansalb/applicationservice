import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE } from "@/lib/appAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Serve a stored language access plan document. AALB reviewers (developers) can
// view any institution's file; a manager can view only their own institution's.
// Served inline so PDFs and images open in the browser, with nosniff so the
// browser cannot be tricked into treating the bytes as another type.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const doc = await withDbRetry("portal.plan.download", () =>
    prisma.planDocument.findUnique({
      where: { id: params.id },
      select: {
        organizationId: true,
        filename: true,
        mimeType: true,
        content: true,
      },
    })
  );
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const allowed =
    session.role === "DEVELOPER" ||
    (session.role === "MANAGER" &&
      session.organizationId === doc.organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = new Uint8Array(doc.content as Buffer);
  const safeName = doc.filename.replace(/[\r\n"]/g, "");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Length": String(body.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
