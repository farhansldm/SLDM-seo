ALTER TABLE "Report"
ADD COLUMN "title" TEXT,
ADD COLUMN "reportData" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "approvedBy" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Report_clientId_status_idx" ON "Report"("clientId", "status");
