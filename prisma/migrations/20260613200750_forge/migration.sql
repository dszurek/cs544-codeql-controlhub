-- CreateTable
CREATE TABLE "ForgeJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "request" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "branch" TEXT,
    "worktreePath" TEXT,
    "summary" TEXT,
    "filesChanged" TEXT,
    "diff" TEXT,
    "testOutput" TEXT,
    "testsPassed" BOOLEAN,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "ForgeJob_status_createdAt_idx" ON "ForgeJob"("status", "createdAt");
