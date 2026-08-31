-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "HazardCategory" AS ENUM ('EARTHQUAKE', 'TSUNAMI', 'LANDSLIDE', 'FLOOD_RIVER', 'FLOOD_COASTAL', 'DROUGHT', 'WILDFIRE', 'STORM_WIND', 'AIR_QUALITY', 'EPIDEMIC_HUMAN', 'EPIDEMIC_ANIMAL', 'CROP_PEST_DISEASE', 'MARINE_HAZARD');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('GREEN', 'YELLOW', 'ORANGE', 'RED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISMISSED');

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "capital" TEXT NOT NULL,
    "areaKm2" DOUBLE PRECISION NOT NULL,
    "population" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "coastal" BOOLEAN NOT NULL DEFAULT false,
    "riverine" BOOLEAN NOT NULL DEFAULT false,
    "landslideRisk" TEXT NOT NULL,
    "vulnerabilityIndex" DOUBLE PRECISION NOT NULL,
    "primaryCrops" TEXT NOT NULL,
    "livestockPresent" BOOLEAN NOT NULL DEFAULT true,
    "elevation" DOUBLE PRECISION,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "population" INTEGER,
    "elevation" DOUBLE PRECISION,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hazard_signals" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "category" "HazardCategory" NOT NULL,
    "source" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "summary" TEXT,
    "metadata" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hazard_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_scores" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "category" "HazardCategory" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "drivers" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_risk_scores" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "category" "HazardCategory" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "drivers" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_forecasts" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "settlementId" TEXT,
    "category" "HazardCategory" NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "predictedScore" DOUBLE PRECISION NOT NULL,
    "predictedLevel" "RiskLevel" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "basis" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "settlementId" TEXT,
    "category" "HazardCategory" NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_disasters" (
    "id" TEXT NOT NULL,
    "districtId" TEXT,
    "category" "HazardCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "deaths" INTEGER,
    "affected" INTEGER,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,

    CONSTRAINT "historical_disasters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizen_reports" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "settlementId" TEXT,
    "category" "HazardCategory" NOT NULL,
    "reporterName" TEXT,
    "contact" TEXT,
    "description" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citizen_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsFetched" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "districtId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settlements_districtId_idx" ON "settlements"("districtId");

-- CreateIndex
CREATE INDEX "hazard_signals_districtId_category_fetchedAt_idx" ON "hazard_signals"("districtId", "category", "fetchedAt");

-- CreateIndex
CREATE INDEX "risk_scores_districtId_category_computedAt_idx" ON "risk_scores"("districtId", "category", "computedAt");

-- CreateIndex
CREATE INDEX "settlement_risk_scores_settlementId_category_computedAt_idx" ON "settlement_risk_scores"("settlementId", "category", "computedAt");

-- CreateIndex
CREATE INDEX "risk_forecasts_districtId_category_horizonDays_generatedAt_idx" ON "risk_forecasts"("districtId", "category", "horizonDays", "generatedAt");

-- CreateIndex
CREATE INDEX "risk_forecasts_settlementId_category_horizonDays_generatedA_idx" ON "risk_forecasts"("settlementId", "category", "horizonDays", "generatedAt");

-- CreateIndex
CREATE INDEX "alerts_districtId_active_idx" ON "alerts"("districtId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard_signals" ADD CONSTRAINT "hazard_signals_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_risk_scores" ADD CONSTRAINT "settlement_risk_scores_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_forecasts" ADD CONSTRAINT "risk_forecasts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_forecasts" ADD CONSTRAINT "risk_forecasts_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_disasters" ADD CONSTRAINT "historical_disasters_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

