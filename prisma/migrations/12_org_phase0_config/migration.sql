-- Developer pre-configuration for Phase 0. Before the institution's MANAGER ever
-- opens the questionnaire, AALB staff already know a lot from contracting: the
-- sector and setting, the languages the engagement covers, the states and metros
-- served, whether they take federal funding. This column holds those known facts
-- so the wizard opens pre-filled (the manager confirms and adjusts) instead of
-- starting from a blank slate. It is developer-authored only; it never flows
-- through the manager's answer-save path.
--
-- The shape is a small JSON object (see src/lib/phase0Config.ts):
--   { sector, orgType, federalFunding, states[], languages[], metros[] }
-- JSONB so more known facts can be added later without another migration.
--
-- Idempotent and additive: re-applied on every boot, never destructive. This
-- database is shared with other live services, so only ADD COLUMN IF NOT EXISTS
-- on our own table appears here.

ALTER TABLE "app_organization"
  ADD COLUMN IF NOT EXISTS "phase0Config" JSONB NOT NULL DEFAULT '{}';
