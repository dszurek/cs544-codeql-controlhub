-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "result" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "scheduledFor" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT,
    "glow" TEXT NOT NULL DEFAULT 'track',
    "jobId" TEXT,
    "dismissedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiJob_status_scheduledFor_idx" ON "AiJob"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "AiJob_type_createdAt_idx" ON "AiJob"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Signal_dismissedAt_createdAt_idx" ON "Signal"("dismissedAt", "createdAt");
