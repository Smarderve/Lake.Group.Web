-- Phase 10 — Analytics & Intelligence
-- First-party event capture feeding the content-health / data-quality
-- dashboard: page views, chatbot questions, no-match queries, searches.

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "page" TEXT,
    "query" TEXT,
    "language" TEXT,
    "sessionId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_page_createdAt_idx" ON "AnalyticsEvent"("page", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_query_createdAt_idx" ON "AnalyticsEvent"("query", "createdAt");
