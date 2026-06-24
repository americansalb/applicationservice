import { prisma } from "./db";

// Guarantee the app_plan_document table exists, using the app's own (working)
// Prisma connection. The boot-time migration runner (server.js) has not reliably
// created this table in production — it may run against a different database than
// the app, or fail silently in the background — so we self-heal idempotently the
// first time the table is touched in a given server process. CREATE TABLE IF NOT
// EXISTS is a no-op once the table is present.
//
// No foreign key here, on purpose: it must succeed regardless of the surrounding
// schema. Referential cleanup is handled in app code (the reset endpoint deletes
// an org's documents explicitly).
let ensured = false;
let inflight: Promise<void> | null = null;

export async function ensurePlanDocumentTable(): Promise<void> {
  if (ensured) return;
  if (!inflight) {
    inflight = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "app_plan_document" (
          "id" TEXT NOT NULL,
          "organizationId" TEXT NOT NULL,
          "filename" TEXT NOT NULL,
          "mimeType" TEXT NOT NULL,
          "sizeBytes" INTEGER NOT NULL,
          "content" BYTEA NOT NULL,
          "uploadedVia" TEXT NOT NULL,
          "uploaderName" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "app_plan_document_pkey" PRIMARY KEY ("id")
        )`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "app_plan_document_organizationId_idx" ON "app_plan_document" ("organizationId")`
      );
      ensured = true;
    })();
  }
  try {
    await inflight;
  } finally {
    // On failure, clear the in-flight promise so a later call can retry.
    if (!ensured) inflight = null;
  }
}
