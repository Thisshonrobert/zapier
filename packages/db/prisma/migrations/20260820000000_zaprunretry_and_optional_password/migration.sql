-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ZapRunRetry" (
    "id" TEXT NOT NULL,
    "zapRunId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZapRunRetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZapRunRetry_zapRunId_idx" ON "ZapRunRetry"("zapRunId");

