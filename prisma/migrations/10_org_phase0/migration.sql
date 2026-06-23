-- Phase 0 (institutional standards alignment) self-serve questionnaire state.
-- The institution's MANAGER answers the questionnaire on their own time; AALB
-- reviews and finalizes, which sets "standardsAlignedAt" (above) and unlocks the
-- candidate assessments. These columns hold the in-progress answers and status
-- that precede that finalize signal.
--
-- Idempotent and additive: re-applied on every boot, never destructive. This
-- database is shared with other live services, so only ADD COLUMN IF NOT EXISTS
-- and a narrow, self-limiting backfill on our own table appear here.

ALTER TABLE "app_organization"
  ADD COLUMN IF NOT EXISTS "phase0Status" TEXT NOT NULL DEFAULT 'not_started';

ALTER TABLE "app_organization"
  ADD COLUMN IF NOT EXISTS "phase0Answers" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "app_organization"
  ADD COLUMN IF NOT EXISTS "phase0SubmittedAt" TIMESTAMP(3);

-- Organizations onboarded before Phase 0 existed already have their standards
-- marked active. Reflect that in the new status so the dashboard reads them as
-- finalized rather than pending. Self-limiting (only touches already-aligned
-- rows whose status has not caught up), so it is safe to re-run on every boot.
UPDATE "app_organization"
  SET "phase0Status" = 'finalized'
  WHERE "standardsAlignedAt" IS NOT NULL
    AND "phase0Status" <> 'finalized';
