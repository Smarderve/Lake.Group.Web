-- Durable, immutable-revision-bound translation work. Existing CMS records
-- are unaffected; new jobs wait safely until a reviewed engine is configured.
CREATE TYPE "TranslationJobStatus" AS ENUM (
  'WAITING_FOR_ENGINE', 'QUEUED', 'TRANSLATING', 'MACHINE_TRANSLATED',
  'VALIDATION_FAILED', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED', 'OUTDATED', 'FAILED'
);

CREATE TABLE "CmsTranslationJob" (
  "id" TEXT NOT NULL,
  "documentKey" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
  "targetLanguage" TEXT NOT NULL,
  "fieldPath" TEXT NOT NULL,
  "contextKey" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "translation" TEXT,
  "modelVersion" TEXT,
  "glossaryVersion" TEXT,
  "status" "TranslationJobStatus" NOT NULL DEFAULT 'WAITING_FOR_ENGINE',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsTranslationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CmsTranslationJob_revisionId_targetLanguage_fieldPath_sourceHash_key"
  ON "CmsTranslationJob"("revisionId", "targetLanguage", "fieldPath", "sourceHash");
CREATE INDEX "CmsTranslationJob_documentKey_revisionId_targetLanguage_status_idx"
  ON "CmsTranslationJob"("documentKey", "revisionId", "targetLanguage", "status");
CREATE INDEX "CmsTranslationJob_status_leaseExpiresAt_createdAt_idx"
  ON "CmsTranslationJob"("status", "leaseExpiresAt", "createdAt");
CREATE INDEX "CmsTranslationJob_sourceHash_targetLanguage_fieldPath_status_idx"
  ON "CmsTranslationJob"("sourceHash", "targetLanguage", "fieldPath", "status");

ALTER TABLE "CmsTranslationJob" ADD CONSTRAINT "CmsTranslationJob_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "ContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "TranslationMemoryOrigin" AS ENUM ('MACHINE_APPROVED', 'ADMIN_CORRECTION');
CREATE TABLE "CmsTranslationMemoryEntry" (
  "id" TEXT NOT NULL,
  "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
  "targetLanguage" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "contextKey" TEXT NOT NULL,
  "translation" TEXT NOT NULL,
  "sourceRevisionId" TEXT,
  "modelVersion" TEXT,
  "glossaryVersion" TEXT,
  "origin" "TranslationMemoryOrigin" NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsTranslationMemoryEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsTranslationMemoryEntry_targetLanguage_sourceHash_contextKey_key"
  ON "CmsTranslationMemoryEntry"("targetLanguage", "sourceHash", "contextKey");
CREATE INDEX "CmsTranslationMemoryEntry_sourceHash_targetLanguage_idx"
  ON "CmsTranslationMemoryEntry"("sourceHash", "targetLanguage");
CREATE INDEX "CmsTranslationMemoryEntry_contextKey_targetLanguage_approvedAt_idx"
  ON "CmsTranslationMemoryEntry"("contextKey", "targetLanguage", "approvedAt");
