-- Additive CMS V2 authorization and immutable release metadata. Legacy Role
-- remains unchanged; no existing user receives CMS V2 access by this migration.
CREATE TYPE "CmsAccessLevel" AS ENUM ('NONE', 'IT_ADMIN');
ALTER TABLE "User" ADD COLUMN "cmsAccessLevel" "CmsAccessLevel" NOT NULL DEFAULT 'NONE';

CREATE TABLE "ContentDocument" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "currentDraftRevisionId" TEXT,
  "currentPublishedRevisionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentDocument_key_key" ON "ContentDocument"("key");

CREATE TABLE "ContentRevision" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "authorId" TEXT,
  "schemaVersion" INTEGER NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContentRevision_documentId_createdAt_idx" ON "ContentRevision"("documentId", "createdAt");

CREATE TABLE "CmsRelease" (
  "id" TEXT NOT NULL,
  "integrity" TEXT NOT NULL,
  "manifest" JSONB NOT NULL,
  "publishedById" TEXT,
  "restoredFromReleaseId" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CmsRelease_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsRelease_integrity_key" ON "CmsRelease"("integrity");
CREATE INDEX "CmsRelease_publishedAt_idx" ON "CmsRelease"("publishedAt");

CREATE TABLE "CmsReleaseDocument" (
  "releaseId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentRevisionId" TEXT NOT NULL,
  CONSTRAINT "CmsReleaseDocument_pkey" PRIMARY KEY ("releaseId", "documentId")
);
CREATE INDEX "CmsReleaseDocument_documentRevisionId_idx" ON "CmsReleaseDocument"("documentRevisionId");

ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CmsRelease" ADD CONSTRAINT "CmsRelease_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CmsRelease" ADD CONSTRAINT "CmsRelease_restoredFromReleaseId_fkey" FOREIGN KEY ("restoredFromReleaseId") REFERENCES "CmsRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CmsReleaseDocument" ADD CONSTRAINT "CmsReleaseDocument_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "CmsRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsReleaseDocument" ADD CONSTRAINT "CmsReleaseDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsReleaseDocument" ADD CONSTRAINT "CmsReleaseDocument_documentRevisionId_fkey" FOREIGN KEY ("documentRevisionId") REFERENCES "ContentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
