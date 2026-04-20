-- All tables prefixed with partners_ to segregate from other services
-- sharing this database

-- Admin users (AALB staff who review partner submissions)
CREATE TABLE IF NOT EXISTS "partners_admin_user" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partners_admin_user_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "partners_admin_user_email_key"
  ON "partners_admin_user" ("email");

-- Partner organizations (hospitals)
CREATE TABLE IF NOT EXISTS "partners_organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "step0CompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partners_organization_pkey" PRIMARY KEY ("id")
);

-- Partner users (hospital contacts who log in and submit data)
CREATE TABLE IF NOT EXISTS "partners_user" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partners_user_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "partners_user_email_key"
  ON "partners_user" ("email");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partners_user_organizationId_fkey') THEN
    ALTER TABLE "partners_user" ADD CONSTRAINT "partners_user_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "partners_organization" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- One row per (org, section_key) with the form data + status
CREATE TABLE IF NOT EXISTS "partners_section_data" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sectionKey" TEXT NOT NULL,
  "formData" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" TEXT NOT NULL DEFAULT 'Not Started',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partners_section_data_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "partners_section_data_org_key"
  ON "partners_section_data" ("organizationId", "sectionKey");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partners_section_data_organizationId_fkey') THEN
    ALTER TABLE "partners_section_data" ADD CONSTRAINT "partners_section_data_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "partners_organization" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Uploaded files stored as bytea
CREATE TABLE IF NOT EXISTS "partners_file" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sectionKey" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "content" BYTEA NOT NULL,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partners_file_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "partners_file_org_section_idx"
  ON "partners_file" ("organizationId", "sectionKey");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partners_file_organizationId_fkey') THEN
    ALTER TABLE "partners_file" ADD CONSTRAINT "partners_file_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "partners_organization" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Clarification thread between admin and partner per section
CREATE TABLE IF NOT EXISTS "partners_clarification" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sectionKey" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL,
  "authorName" TEXT,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partners_clarification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "partners_clarification_org_section_idx"
  ON "partners_clarification" ("organizationId", "sectionKey");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partners_clarification_organizationId_fkey') THEN
    ALTER TABLE "partners_clarification" ADD CONSTRAINT "partners_clarification_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "partners_organization" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Audit log
CREATE TABLE IF NOT EXISTS "partners_audit_log" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "userId" TEXT,
  "userRole" TEXT,
  "userEmail" TEXT,
  "organizationId" TEXT,
  "sectionKey" TEXT,
  "detail" TEXT,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partners_audit_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "partners_audit_log_org_idx"
  ON "partners_audit_log" ("organizationId");
CREATE INDEX IF NOT EXISTS "partners_audit_log_created_idx"
  ON "partners_audit_log" ("createdAt" DESC);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS "partners_password_reset" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partners_password_reset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "partners_password_reset_token_idx"
  ON "partners_password_reset" ("token");
