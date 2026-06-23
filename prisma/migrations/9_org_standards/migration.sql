-- Phase 0 / institutional standards alignment status for the evaluation
-- platform. NULL = pending setup; a timestamp = standards active (valid two
-- years from it). Idempotent and additive; re-applied on every boot.

ALTER TABLE "app_organization" ADD COLUMN IF NOT EXISTS "standardsAlignedAt" TIMESTAMP(3);
