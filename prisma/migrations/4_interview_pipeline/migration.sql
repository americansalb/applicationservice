-- Turn standalone interviews into a gated, ordered pipeline per job.
-- Rounds gain a format (self-paced video vs live scheduled). A per-candidate
-- "access" row gates each round: a later round only becomes reachable when an
-- admin advances the candidate, which mints the next round's access token.

-- Round format + live scheduling config (timezone, duration, slots…)
ALTER TABLE "careers_interview_template" ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'self_paced';
ALTER TABLE "careers_interview_template" ADD COLUMN IF NOT EXISTS "liveConfig" JSONB;

-- Per-candidate, per-round access token (the gate).
CREATE TABLE IF NOT EXISTS "careers_interview_access" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "jobId" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "submissionId" TEXT,
    "bookedSlot" TIMESTAMP(3),
    "previousAccessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "careers_interview_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "careers_interview_access_token_key" ON "careers_interview_access"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "careers_interview_access_submissionId_key" ON "careers_interview_access"("submissionId");
CREATE INDEX IF NOT EXISTS "careers_interview_access_interviewId_idx" ON "careers_interview_access"("interviewId");
CREATE INDEX IF NOT EXISTS "careers_interview_access_jobId_email_idx" ON "careers_interview_access"("jobId", "email");
-- One candidate per live slot, per interview.
CREATE UNIQUE INDEX IF NOT EXISTS "careers_interview_access_slot_key"
    ON "careers_interview_access"("interviewId", "bookedSlot")
    WHERE "bookedSlot" IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'careers_interview_access_interviewId_fkey') THEN
        ALTER TABLE "careers_interview_access"
            ADD CONSTRAINT "careers_interview_access_interviewId_fkey"
            FOREIGN KEY ("interviewId") REFERENCES "careers_interview_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'careers_interview_access_submissionId_fkey') THEN
        ALTER TABLE "careers_interview_access"
            ADD CONSTRAINT "careers_interview_access_submissionId_fkey"
            FOREIGN KEY ("submissionId") REFERENCES "careers_interview_submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
