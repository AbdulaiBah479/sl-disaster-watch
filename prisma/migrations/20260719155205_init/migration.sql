-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "capital" TEXT NOT NULL,
    "areaKm2" REAL NOT NULL,
    "population" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "coastal" BOOLEAN NOT NULL DEFAULT false,
    "riverine" BOOLEAN NOT NULL DEFAULT false,
    "landslideRisk" TEXT NOT NULL,
    "vulnerabilityIndex" REAL NOT NULL,
    "primaryCrops" TEXT NOT NULL,
    "livestockPresent" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "hazard_signals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT,
    "summary" TEXT,
    "metadata" TEXT,
    "observedAt" DATETIME NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hazard_signals_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "risk_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "level" TEXT NOT NULL,
    "drivers" TEXT NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_scores_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "alerts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "historical_disasters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "deaths" INTEGER,
    "affected" INTEGER,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    CONSTRAINT "historical_disasters_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "citizen_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reporterName" TEXT,
    "contact" TEXT,
    "description" TEXT NOT NULL,
    "lat" REAL,
    "lon" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "citizen_reports_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsFetched" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "hazard_signals_districtId_category_fetchedAt_idx" ON "hazard_signals"("districtId", "category", "fetchedAt");

-- CreateIndex
CREATE INDEX "risk_scores_districtId_category_computedAt_idx" ON "risk_scores"("districtId", "category", "computedAt");

-- CreateIndex
CREATE INDEX "alerts_districtId_active_idx" ON "alerts"("districtId", "active");
