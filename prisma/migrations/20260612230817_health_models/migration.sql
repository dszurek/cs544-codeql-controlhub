-- CreateTable
CREATE TABLE "HealthSample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "source" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HealthDaily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "sleepMinutes" REAL,
    "sleepDeepMin" REAL,
    "sleepRemMin" REAL,
    "sleepCoreMin" REAL,
    "sleepAwakeMin" REAL,
    "hrvMs" REAL,
    "restingHr" REAL,
    "steps" REAL,
    "activeEnergy" REAL,
    "exerciseMinutes" REAL,
    "respRate" REAL,
    "readiness" REAL,
    "sleepDebtMin" REAL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "duration" REAL,
    "energy" REAL,
    "distance" REAL,
    "avgHr" REAL,
    "maxHr" REAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "HealthSample_type_startDate_idx" ON "HealthSample"("type", "startDate");

-- CreateIndex
CREATE INDEX "HealthSample_startDate_idx" ON "HealthSample"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "HealthSample_type_startDate_endDate_key" ON "HealthSample"("type", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "HealthDaily_date_key" ON "HealthDaily"("date");

-- CreateIndex
CREATE INDEX "HealthDaily_date_idx" ON "HealthDaily"("date");

-- CreateIndex
CREATE INDEX "Workout_startDate_idx" ON "Workout"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Workout_type_startDate_endDate_key" ON "Workout"("type", "startDate", "endDate");
