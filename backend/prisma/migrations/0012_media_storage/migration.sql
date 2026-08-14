ALTER TABLE "Media"
  ADD COLUMN "storageProvider" TEXT,
  ADD COLUMN "storageKey" TEXT;

CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");
