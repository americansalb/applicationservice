-- Allow inviting Developer accounts (AALB staff), which have no organization.
-- Idempotent and additive: re-applied on every boot, never touches legacy data.

-- Developers have no organization, so an invitation's organization is optional.
ALTER TABLE "app_invitation" ALTER COLUMN "organizationId" DROP NOT NULL;

-- Permit DEVELOPER in the invitation role check (was MANAGER/PROFESSIONAL only).
ALTER TABLE "app_invitation" DROP CONSTRAINT IF EXISTS "app_invitation_role_check";
ALTER TABLE "app_invitation"
  ADD CONSTRAINT "app_invitation_role_check"
  CHECK ("role" IN ('DEVELOPER', 'MANAGER', 'PROFESSIONAL'));
