-- CreateTable
CREATE TABLE "GradeClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "creditHours" REAL NOT NULL DEFAULT 3,
    "qualityPoints" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GradeCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GradeCategory_classId_fkey" FOREIGN KEY ("classId") REFERENCES "GradeClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradeAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "pointsEarned" REAL,
    "pointsPossible" REAL NOT NULL DEFAULT 100,
    "dueDate" DATETIME,
    "isUpcoming" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GradeAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "GradeClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GradeAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GradeCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GradeCategory_classId_idx" ON "GradeCategory"("classId");

-- CreateIndex
CREATE INDEX "GradeAssignment_classId_idx" ON "GradeAssignment"("classId");

-- CreateIndex
CREATE INDEX "GradeAssignment_categoryId_idx" ON "GradeAssignment"("categoryId");
