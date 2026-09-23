-- AlterTable
ALTER TABLE "ZapRunRetry"
ADD COLUMN "evidenceSource" TEXT,
ADD COLUMN "dlqPublishClaimToken" TEXT,
ADD COLUMN "dlqPublishLeaseUntil" TIMESTAMP(3),
ADD COLUMN "dlqNextAttemptAt" TIMESTAMP(3),
ADD COLUMN "dlqPublishAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ZapRunRetry_dlqPublishedAt_dlqNextAttemptAt_idx" ON "ZapRunRetry"("dlqPublishedAt", "dlqNextAttemptAt");
