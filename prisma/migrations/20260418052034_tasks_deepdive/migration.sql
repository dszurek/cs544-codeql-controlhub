-- AlterTable
ALTER TABLE "Task" ADD COLUMN "courseId" TEXT;
ALTER TABLE "Task" ADD COLUMN "description" TEXT;
ALTER TABLE "Task" ADD COLUMN "estimatedMinutes" INTEGER;
ALTER TABLE "Task" ADD COLUMN "startDate" DATETIME;

-- CreateTable
CREATE TABLE "TaskBlocker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskBlocker_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskBlocker_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskEmailLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TaskEventLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TaskBlocker_taskId_idx" ON "TaskBlocker"("taskId");

-- CreateIndex
CREATE INDEX "TaskBlocker_blockerId_idx" ON "TaskBlocker"("blockerId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskBlocker_taskId_blockerId_key" ON "TaskBlocker"("taskId", "blockerId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");

-- CreateIndex
CREATE INDEX "TaskEmailLink_taskId_idx" ON "TaskEmailLink"("taskId");

-- CreateIndex
CREATE INDEX "TaskEmailLink_emailId_idx" ON "TaskEmailLink"("emailId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskEmailLink_taskId_emailId_key" ON "TaskEmailLink"("taskId", "emailId");

-- CreateIndex
CREATE INDEX "TaskEventLink_taskId_idx" ON "TaskEventLink"("taskId");

-- CreateIndex
CREATE INDEX "TaskEventLink_eventId_idx" ON "TaskEventLink"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskEventLink_taskId_eventId_key" ON "TaskEventLink"("taskId", "eventId");
