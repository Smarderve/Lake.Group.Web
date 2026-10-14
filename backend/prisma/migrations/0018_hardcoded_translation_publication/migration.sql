ALTER TABLE "HardcodedTranslationJob"
  ADD COLUMN "page" TEXT,
  ADD COLUMN "applicablePages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "classification" TEXT NOT NULL DEFAULT 'public-visitor-copy',
  ADD COLUMN "targetSelector" TEXT,
  ADD COLUMN "targetAttribute" TEXT,
  ADD COLUMN "renderMode" TEXT NOT NULL DEFAULT 'source-only';

CREATE TABLE "HardcodedTranslationMemoryEntry" (
  "id" TEXT NOT NULL,
  "targetLanguage" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "contextKey" TEXT NOT NULL,
  "translation" TEXT NOT NULL,
  "sourceRevisionId" TEXT,
  "modelVersion" TEXT,
  "approvedById" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HardcodedTranslationMemoryEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HardcodedTranslationMemoryEntry_targetLanguage_sourceHash_contextKey_key" ON "HardcodedTranslationMemoryEntry"("targetLanguage", "sourceHash", "contextKey");
CREATE INDEX "HardcodedTranslationMemoryEntry_sourceHash_targetLanguage_idx" ON "HardcodedTranslationMemoryEntry"("sourceHash", "targetLanguage");
