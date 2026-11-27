CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

CREATE TABLE "SupportInquiry" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "phone" VARCHAR(30),
  "subject" VARCHAR(160) NOT NULL,
  "message" VARCHAR(5000) NOT NULL,
  "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
  "adminNotes" TEXT,
  "assignedAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportInquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportInquiry_status_createdAt_idx"
  ON "SupportInquiry"("status", "createdAt");
CREATE INDEX "SupportInquiry_email_createdAt_idx"
  ON "SupportInquiry"("email", "createdAt");
CREATE INDEX "SupportInquiry_assignedAdminId_status_idx"
  ON "SupportInquiry"("assignedAdminId", "status");

ALTER TABLE "SupportInquiry"
  ADD CONSTRAINT "SupportInquiry_assignedAdminId_fkey"
  FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
