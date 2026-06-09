-- Granular interview configuration (Phase 1).
-- Strictly ADDITIVE: new nullable / defaulted columns only, so other services
-- sharing this database are unaffected and existing rows keep their behaviour.

-- Session-level capture config: { captureMode, maxSubmissions }.
ALTER TABLE "careers_interview_template"
  ADD COLUMN IF NOT EXISTS "config" JSONB;

-- Per-candidate submission attempts (vs config.maxSubmissions).
ALTER TABLE "careers_interview_access"
  ADD COLUMN IF NOT EXISTS "attemptsUsed" INTEGER NOT NULL DEFAULT 0;
