-- AlterTable
ALTER TABLE "ZapRunExecution"
ADD COLUMN "claimToken" TEXT,
ADD COLUMN "providerOutcome" TEXT,
ADD COLUMN "actionFingerprint" TEXT,
ADD COLUMN "requestFingerprint" TEXT,
ADD COLUMN "requiresHuman" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ZapRunRetry"
ADD COLUMN "executionId" TEXT,
ADD COLUMN "provider" TEXT,
ADD COLUMN "phase" TEXT,
ADD COLUMN "providerOutcome" TEXT,
ADD COLUMN "safeCode" TEXT,
ADD COLUMN "providerStatus" INTEGER,
ADD COLUMN "retryAfterSeconds" INTEGER,
ADD COLUMN "safeReceiptId" TEXT,
ADD COLUMN "actionFingerprint" TEXT,
ADD COLUMN "requestFingerprint" TEXT,
ADD COLUMN "requiresHuman" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "dlqPublishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ZapRunExecutionAttempt" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "phase" TEXT,
    "safeCode" TEXT,
    "providerStatus" INTEGER,
    "retryAfterSeconds" INTEGER,
    "safeReceiptId" TEXT,
    "actionFingerprint" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ZapRunExecutionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZapRunRetry_executionId_key" ON "ZapRunRetry"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "ZapRunExecutionAttempt_executionId_attemptNumber_key" ON "ZapRunExecutionAttempt"("executionId", "attemptNumber");

-- CreateIndex
CREATE INDEX "ZapRunExecutionAttempt_executionId_idx" ON "ZapRunExecutionAttempt"("executionId");

-- AddForeignKey
ALTER TABLE "ZapRunRetry" ADD CONSTRAINT "ZapRunRetry_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ZapRunExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZapRunExecutionAttempt" ADD CONSTRAINT "ZapRunExecutionAttempt_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ZapRunExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
