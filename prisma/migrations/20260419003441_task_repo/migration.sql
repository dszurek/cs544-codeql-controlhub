-- CreateTable
CREATE TABLE "TaskRepo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "branch" TEXT,
    "localPath" TEXT,
    "defaultInstruction" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskRepo_taskId_key" ON "TaskRepo"("taskId");
