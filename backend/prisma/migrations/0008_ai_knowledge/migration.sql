-- Phase 9 — AI / Corporate Knowledge
-- Track questions the assistant cannot answer from approved content so
-- content gaps surface in the admin (blueprint §7: unanswered-question
-- tracking, content-gap identification).

-- CreateTable
CREATE TABLE "UnansweredQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "page" TEXT,
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "answerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnansweredQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnansweredQuestion_answered_createdAt_idx" ON "UnansweredQuestion"("answered", "createdAt");
