ALTER TABLE "AiRequest"
ADD COLUMN "websiteId" TEXT,
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mock',
ADD COLUMN "model" TEXT NOT NULL DEFAULT 'seo-research-v1',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "outputPayload" JSONB,
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "durationMs" INTEGER,
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

ALTER TABLE "AiRequest"
ADD CONSTRAINT "AiRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "AiRequest_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "AiRequest_userId_idx";
DROP INDEX IF EXISTS "AiRequest_clientId_idx";
CREATE INDEX "AiRequest_userId_createdAt_idx" ON "AiRequest"("userId", "createdAt");
CREATE INDEX "AiRequest_clientId_createdAt_idx" ON "AiRequest"("clientId", "createdAt");
CREATE INDEX "AiRequest_websiteId_idx" ON "AiRequest"("websiteId");
CREATE INDEX "AiRequest_reviewStatus_idx" ON "AiRequest"("reviewStatus");
