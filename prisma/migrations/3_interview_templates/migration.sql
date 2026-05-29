-- Admin-authored interviews ("interview templates") that can be assigned to a
-- role and shared with candidates via an unguessable invitation link. Self-paced
-- video + written answers land in "careers_interview_submission".

-- CreateTable
CREATE TABLE IF NOT EXISTS "careers_interview_template" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "jobId" TEXT,
    "roleTitle" TEXT,
    "intro" TEXT,
    "questions" JSONB NOT NULL,
    "videoRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "careers_interview_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "careers_interview_template_slug_key" ON "careers_interview_template"("slug");
CREATE INDEX IF NOT EXISTS "careers_interview_template_jobId_idx" ON "careers_interview_template"("jobId");

-- Link submissions back to the interview they came from, plus which round.
ALTER TABLE "careers_interview_submission" ADD COLUMN IF NOT EXISTS "interviewId" TEXT;
ALTER TABLE "careers_interview_submission" ADD COLUMN IF NOT EXISTS "round" INTEGER NOT NULL DEFAULT 2;

CREATE INDEX IF NOT EXISTS "careers_interview_submission_interviewId_idx" ON "careers_interview_submission"("interviewId");

-- AddForeignKey (template -> job): keep the template if the job is removed.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'careers_job')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'careers_interview_template_jobId_fkey') THEN
        ALTER TABLE "careers_interview_template"
            ADD CONSTRAINT "careers_interview_template_jobId_fkey"
            FOREIGN KEY ("jobId") REFERENCES "careers_job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (submission -> template): keep submissions if the template is removed.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'careers_interview_submission_interviewId_fkey') THEN
        ALTER TABLE "careers_interview_submission"
            ADD CONSTRAINT "careers_interview_submission_interviewId_fkey"
            FOREIGN KEY ("interviewId") REFERENCES "careers_interview_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
