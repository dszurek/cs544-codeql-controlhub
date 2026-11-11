-- CreateTable
CREATE TABLE "CalendarSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "color" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSource_url_key" ON "CalendarSource"("url");
