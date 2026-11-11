-- AlterTable
ALTER TABLE "Email" ADD COLUMN "snoozedUntil" DATETIME;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "blockEnd" DATETIME;
ALTER TABLE "Task" ADD COLUMN "blockStart" DATETIME;
ALTER TABLE "Task" ADD COLUMN "snoozedUntil" DATETIME;

-- CreateTable
CREATE TABLE "TaskLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TaskLink_sourceType_sourceId_idx" ON "TaskLink"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "TaskLink_targetType_targetId_idx" ON "TaskLink"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskLink_sourceType_sourceId_targetType_targetId_key" ON "TaskLink"("sourceType", "sourceId", "targetType", "targetId");
