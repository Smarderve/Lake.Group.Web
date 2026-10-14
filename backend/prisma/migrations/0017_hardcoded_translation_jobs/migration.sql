CREATE TABLE "HardcodedTranslationJob" (
    "id" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "contextKey" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "targetLanguage" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "translation" TEXT,
    "modelVersion" TEXT,
    "glossaryVersion" TEXT,
    "status" "TranslationJobStatus" NOT NULL DEFAULT 'WAITING_FOR_ENGINE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "manifestVersion" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HardcodedTranslationJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HardcodedTranslationJob_sourceHash_targetLanguage_contextKey_key" ON "HardcodedTranslationJob"("sourceHash", "targetLanguage", "contextKey");
CREATE INDEX "HardcodedTranslationJob_status_leaseExpiresAt_createdAt_idx" ON "HardcodedTranslationJob"("status", "leaseExpiresAt", "createdAt");
CREATE INDEX "HardcodedTranslationJob_sourceFile_manifestVersion_idx" ON "HardcodedTranslationJob"("sourceFile", "manifestVersion");
