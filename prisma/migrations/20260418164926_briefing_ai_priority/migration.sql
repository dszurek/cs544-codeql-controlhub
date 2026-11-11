-- CreateTable
CREATE TABLE "Briefing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summary" TEXT NOT NULL,
    "priorityTasks" TEXT NOT NULL DEFAULT '[]',
    "priorityEmails" TEXT NOT NULL DEFAULT '[]',
    "model" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "preview" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "aiPriority" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Email" ("id", "isRead", "preview", "receivedAt", "senderEmail", "senderName", "source", "sourceId", "subject", "updatedAt") SELECT "id", "isRead", "preview", "receivedAt", "senderEmail", "senderName", "source", "sourceId", "subject", "updatedAt" FROM "Email";
DROP TABLE "Email";
ALTER TABLE "new_Email" RENAME TO "Email";
CREATE UNIQUE INDEX "Email_source_sourceId_key" ON "Email"("source", "sourceId");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("completedAt", "courseId", "createdAt", "description", "dueDate", "dueTime", "estimatedMinutes", "externalId", "id", "notes", "parentId", "priority", "projectId", "recurrence", "source", "startDate", "status", "title", "type") SELECT "completedAt", "courseId", "createdAt", "description", "dueDate", "dueTime", "estimatedMinutes", "externalId", "id", "notes", "parentId", "priority", "projectId", "recurrence", "source", "startDate", "status", "title", "type" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_externalId_key" ON "Task"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
