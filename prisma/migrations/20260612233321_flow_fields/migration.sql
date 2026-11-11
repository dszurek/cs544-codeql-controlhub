-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "priority" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" DATETIME,
    "dueTime" TEXT,
    "startDate" DATETIME,
    "estimatedMinutes" INTEGER,
    "courseId" TEXT,
    "recurrence" TEXT,
    "projectId" TEXT,
    "parentId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "aiPriority" BOOLEAN NOT NULL DEFAULT false,
    "snoozedUntil" DATETIME,
    "blockStart" DATETIME,
    "blockEnd" DATETIME,
    "blockPinned" BOOLEAN NOT NULL DEFAULT false,
    "blockSource" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("aiPriority", "blockEnd", "blockStart", "completedAt", "courseId", "createdAt", "description", "dueDate", "dueTime", "estimatedMinutes", "externalId", "id", "notes", "parentId", "priority", "projectId", "recurrence", "snoozedUntil", "source", "startDate", "status", "title", "type") SELECT "aiPriority", "blockEnd", "blockStart", "completedAt", "courseId", "createdAt", "description", "dueDate", "dueTime", "estimatedMinutes", "externalId", "id", "notes", "parentId", "priority", "projectId", "recurrence", "snoozedUntil", "source", "startDate", "status", "title", "type" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_externalId_key" ON "Task"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
