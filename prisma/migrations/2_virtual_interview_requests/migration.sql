CREATE TABLE IF NOT EXISTS "careers_virtual_interview_request" (
    "id" TEXT NOT NULL,
    "jobSlug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "careers_virtual_interview_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "careers_virtual_interview_request_jobSlug_idx" ON "careers_virtual_interview_request"("jobSlug");
CREATE INDEX IF NOT EXISTS "careers_virtual_interview_request_contactedAt_idx" ON "careers_virtual_interview_request"("contactedAt");
