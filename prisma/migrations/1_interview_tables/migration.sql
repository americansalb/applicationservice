-- CreateTable
CREATE TABLE "careers_interview_submission" (
    "id" TEXT NOT NULL,
    "jobSlug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT,
    "linkedIn" TEXT,
    "yearsExp" TEXT,
    "answers" JSONB NOT NULL,
    "videoUrls" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'New',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_interview_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers_interview_booking" (
    "id" TEXT NOT NULL,
    "jobSlug" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "careers_interview_booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "careers_interview_submission_jobSlug_idx" ON "careers_interview_submission"("jobSlug");

-- CreateIndex
CREATE INDEX "careers_interview_booking_jobSlug_idx" ON "careers_interview_booking"("jobSlug");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "careers_interview_booking_jobSlug_slotStart_key" ON "careers_interview_booking"("jobSlug", "slotStart");
