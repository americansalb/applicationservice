-- Organizations + invitations for the evaluation platform.
-- Idempotent and additive: re-applied on every boot, never touches legacy data.

CREATE TABLE IF NOT EXISTS "app_organization" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'active',
  "createdById" UUID,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "app_organization"
    ADD CONSTRAINT "app_organization_status_check" CHECK ("status" IN ('active', 'disabled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Link users to an organization (managers + professionals).
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "organizationId" UUID;
CREATE INDEX IF NOT EXISTS "app_user_organizationId_idx" ON "app_user" ("organizationId");
DO $$ BEGIN
  ALTER TABLE "app_user"
    ADD CONSTRAINT "app_user_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "app_organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "app_invitation" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "token"          TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "name"           TEXT,
  "role"           TEXT NOT NULL,
  "organizationId" UUID NOT NULL REFERENCES "app_organization"("id") ON DELETE CASCADE,
  "invitedById"    UUID,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "acceptedAt"     TIMESTAMP(3),
  "acceptedUserId" UUID,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_invitation_token_key" ON "app_invitation" ("token");
CREATE INDEX IF NOT EXISTS "app_invitation_organizationId_idx" ON "app_invitation" ("organizationId");
CREATE INDEX IF NOT EXISTS "app_invitation_email_idx" ON "app_invitation" ("email");

DO $$ BEGIN
  ALTER TABLE "app_invitation"
    ADD CONSTRAINT "app_invitation_role_check" CHECK ("role" IN ('MANAGER', 'PROFESSIONAL'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "app_invitation"
    ADD CONSTRAINT "app_invitation_status_check" CHECK ("status" IN ('pending', 'accepted', 'revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
