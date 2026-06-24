-- An institution's written language access plan, collected during Phase 0 so AALB
-- can review it. The file is stored as bytes (mirroring partners_file), keyed to
-- the organization. It can arrive from the manager in the wizard or from a
-- colleague via an emailed, token-gated upload link.
--
-- Idempotent and additive: a new table only, created if absent. This database is
-- shared with other live services, so nothing here drops or alters existing
-- tables. Numeric prefix 11 sorts after 10 (the app_organization columns) and
-- after 7 (app_organization itself), so the foreign key target exists first.

CREATE TABLE IF NOT EXISTS "app_plan_document" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "filename"       TEXT NOT NULL,
  "mimeType"       TEXT NOT NULL,
  "sizeBytes"      INTEGER NOT NULL,
  "content"        BYTEA NOT NULL,
  "uploadedVia"    TEXT NOT NULL,
  "uploaderName"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_plan_document_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_plan_document_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "app_organization" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "app_plan_document_organizationId_idx"
  ON "app_plan_document" ("organizationId");
