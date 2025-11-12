/*
  Warnings:

  - Added the required column `imageUrl` to the `AvailableAction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `AvailableTriggerType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AvailableAction" ADD COLUMN     "imageUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AvailableTriggerType" ADD COLUMN     "imageUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Zap" ADD COLUMN     "name" TEXT DEFAULT 'Untitled Zap',
ADD COLUMN     "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
