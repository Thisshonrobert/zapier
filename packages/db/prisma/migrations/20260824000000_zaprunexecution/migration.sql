-- CreateTable
CREATE TABLE "ZapRunExecution" (
    "id" TEXT NOT NULL,
    "zapRunId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "leaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ZapRunExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZapRunExecution_zapRunId_stage_key" ON "ZapRunExecution"("zapRunId", "stage");

-- CreateIndex
CREATE INDEX "ZapRunExecution_zapRunId_idx" ON "ZapRunExecution"("zapRunId");
