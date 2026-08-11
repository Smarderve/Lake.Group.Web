-- AlterTable
ALTER TABLE "CSREntry" ADD COLUMN     "imageMediaId" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "logoMediaId" TEXT;

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "mapCategoryId" TEXT,
ADD COLUMN     "mapVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "markerLabel" TEXT;

-- AlterTable
ALTER TABLE "HistoryEvent" ADD COLUMN     "imageMediaId" TEXT;

-- AlterTable
ALTER TABLE "Leadership" ADD COLUMN     "photoMediaId" TEXT;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "copyright" TEXT,
ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "license" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "status" "GovernedStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "variants" JSONB,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "News" ADD COLUMN     "heroMediaId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "coverMediaId" TEXT;

-- CreateTable
CREATE TABLE "MediaVersion" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "GovernedStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "GovernedStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapCategoryVersion" (
    "id" TEXT NOT NULL,
    "mapCategoryId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "GovernedStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapCategoryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaVersion_mediaId_createdAt_idx" ON "MediaVersion"("mediaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFolder_slug_key" ON "MediaFolder"("slug");

-- CreateIndex
CREATE INDEX "MediaUsage_mediaId_idx" ON "MediaUsage"("mediaId");

-- CreateIndex
CREATE INDEX "MediaUsage_entityType_entityId_idx" ON "MediaUsage"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "MapCategory_slug_key" ON "MapCategory"("slug");

-- CreateIndex
CREATE INDEX "MapCategoryVersion_mapCategoryId_createdAt_idx" ON "MapCategoryVersion"("mapCategoryId", "createdAt");

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_mapCategoryId_fkey" FOREIGN KEY ("mapCategoryId") REFERENCES "MapCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaVersion" ADD CONSTRAINT "MediaVersion_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leadership" ADD CONSTRAINT "Leadership_photoMediaId_fkey" FOREIGN KEY ("photoMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEvent" ADD CONSTRAINT "HistoryEvent_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSREntry" ADD CONSTRAINT "CSREntry_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapCategoryVersion" ADD CONSTRAINT "MapCategoryVersion_mapCategoryId_fkey" FOREIGN KEY ("mapCategoryId") REFERENCES "MapCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

