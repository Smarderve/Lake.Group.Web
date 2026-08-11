-- Phase 3 — Corporate Truth: governance workflow for corporate metrics.
-- Metric holds the current state; MetricVersion is the immutable history.

-- CreateEnum
CREATE TYPE "MetricStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "ownerId" TEXT,
    "source" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationDate" TIMESTAMP(3),
    "verificationNote" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "status" "MetricStatus" NOT NULL DEFAULT 'DRAFT',
    "consumers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricVersion" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" "MetricStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Metric_key_key" ON "Metric"("key");

-- CreateIndex
CREATE INDEX "MetricVersion_metricId_createdAt_idx" ON "MetricVersion"("metricId", "createdAt");

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricVersion" ADD CONSTRAINT "MetricVersion_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
