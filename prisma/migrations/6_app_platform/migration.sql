-- New evaluation-platform identity table: Developers, Managers, Professionals.
--
-- This file is re-applied on every boot (see server.js), so every statement
-- must tolerate already-existing objects. It is strictly ADDITIVE and never
-- touches the legacy careers_* / partners_* tables that share this database.

CREATE TABLE IF NOT EXISTS "app_user" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"              TEXT NOT NULL,
  "password"           TEXT NOT NULL,
  "name"               TEXT NOT NULL,
  "role"               TEXT NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'active',
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "managerId"          UUID REFERENCES "app_user"("id") ON DELETE SET NULL,
  "createdById"        UUID,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- Emails are normalised to lower-case in application code, so a plain unique
-- index matches the Prisma `@unique` declaration exactly.
CREATE UNIQUE INDEX IF NOT EXISTS "app_user_email_key" ON "app_user" ("email");
CREATE INDEX IF NOT EXISTS "app_user_role_idx" ON "app_user" ("role");
CREATE INDEX IF NOT EXISTS "app_user_managerId_idx" ON "app_user" ("managerId");

DO $$ BEGIN
  ALTER TABLE "app_user"
    ADD CONSTRAINT "app_user_role_check" CHECK ("role" IN ('DEVELOPER', 'MANAGER', 'PROFESSIONAL'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "app_user"
    ADD CONSTRAINT "app_user_status_check" CHECK ("status" IN ('active', 'disabled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
