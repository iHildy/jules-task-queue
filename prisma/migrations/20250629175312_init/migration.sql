-- CreateTable
CREATE TABLE "jules_tasks" (
    "id" SERIAL NOT NULL,
    "githubRepoId" BIGINT NOT NULL,
    "githubIssueId" BIGINT NOT NULL,
    "githubIssueNumber" BIGINT NOT NULL,
    "flaggedForRetry" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jules_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" SERIAL NOT NULL,
    "eventType" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "processingTime" INTEGER NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jules_tasks_githubIssueId_key" ON "jules_tasks"("githubIssueId");

-- CreateIndex
CREATE INDEX "jules_tasks_flaggedForRetry_idx" ON "jules_tasks"("flaggedForRetry");

-- CreateIndex
CREATE INDEX "jules_tasks_githubRepoId_idx" ON "jules_tasks"("githubRepoId");

-- CreateIndex
CREATE INDEX "webhook_logs_eventType_idx" ON "webhook_logs"("eventType");

-- CreateIndex
CREATE INDEX "webhook_logs_success_idx" ON "webhook_logs"("success");

-- CreateIndex
CREATE INDEX "webhook_logs_createdAt_idx" ON "webhook_logs"("createdAt");
