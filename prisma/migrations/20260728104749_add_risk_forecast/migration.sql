-- CreateTable
CREATE TABLE "risk_forecasts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "settlementId" TEXT,
    "category" TEXT NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "predictedScore" REAL NOT NULL,
    "predictedLevel" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "basis" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_forecasts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "risk_forecasts_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "risk_forecasts_districtId_category_horizonDays_generatedAt_idx" ON "risk_forecasts"("districtId", "category", "horizonDays", "generatedAt");

-- CreateIndex
CREATE INDEX "risk_forecasts_settlementId_category_horizonDays_generatedAt_idx" ON "risk_forecasts"("settlementId", "category", "horizonDays", "generatedAt");
