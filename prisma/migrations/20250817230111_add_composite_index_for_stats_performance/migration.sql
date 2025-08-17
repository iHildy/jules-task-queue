-- CreateIndex
CREATE INDEX "jules_tasks_flaggedForRetry_createdAt_idx" ON "jules_tasks"("flaggedForRetry", "createdAt");
