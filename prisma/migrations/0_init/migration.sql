-- CreateTable
CREATE TABLE "careers_job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "salary" TEXT,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "benefits" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers_application" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "resumeText" TEXT,
    "coverLetter" TEXT,
    "linkedIn" TEXT,
    "portfolio" TEXT,
    "yearsExp" TEXT,
    "startDate" TEXT,
    "referral" TEXT,
    "legallyAuth" TEXT,
    "additionalInfo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers_admin_user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "careers_admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "careers_admin_user_email_key" ON "careers_admin_user"("email");

-- AddForeignKey
ALTER TABLE "careers_application" ADD CONSTRAINT "careers_application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "careers_job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
