-- DropIndex
DROP INDEX "Action_zapId_key";

-- CreateTable
CREATE TABLE "TestTriggerBuffer" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "tempZapId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestTriggerBuffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Action_zapId_idx" ON "Action"("zapId");
