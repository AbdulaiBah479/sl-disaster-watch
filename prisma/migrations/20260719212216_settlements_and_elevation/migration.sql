-- AlterTable
ALTER TABLE "districts" ADD COLUMN "elevation" REAL;

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "population" INTEGER,
    "elevation" REAL,
    CONSTRAINT "settlements_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settlement_risk_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "settlementId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "level" TEXT NOT NULL,
    "drivers" TEXT NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "settlement_risk_scores_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "settlementId" TEXT,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "alerts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "alerts_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_alerts" ("active", "category", "districtId", "id", "issuedAt", "level", "message", "source", "title") SELECT "active", "category", "districtId", "id", "issuedAt", "level", "message", "source", "title" FROM "alerts";
DROP TABLE "alerts";
ALTER TABLE "new_alerts" RENAME TO "alerts";
CREATE INDEX "alerts_districtId_active_idx" ON "alerts"("districtId", "active");
CREATE TABLE "new_citizen_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "settlementId" TEXT,
    "category" TEXT NOT NULL,
    "reporterName" TEXT,
    "contact" TEXT,
    "description" TEXT NOT NULL,
    "lat" REAL,
    "lon" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "citizen_reports_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "citizen_reports_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_citizen_reports" ("category", "contact", "createdAt", "description", "districtId", "id", "lat", "lon", "reporterName", "status") SELECT "category", "contact", "createdAt", "description", "districtId", "id", "lat", "lon", "reporterName", "status" FROM "citizen_reports";
DROP TABLE "citizen_reports";
ALTER TABLE "new_citizen_reports" RENAME TO "citizen_reports";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "settlements_districtId_idx" ON "settlements"("districtId");

-- CreateIndex
CREATE INDEX "settlement_risk_scores_settlementId_category_computedAt_idx" ON "settlement_risk_scores"("settlementId", "category", "computedAt");
