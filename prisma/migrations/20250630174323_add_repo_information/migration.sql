/*
  Warnings:

  - You are about to drop the column `processingTime` on the `webhook_logs` table. All the data in the column will be lost.
  - Added the required column `repoName` to the `jules_tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repoOwner` to the `jules_tasks` table without a default value. This is not possible if the table is not empty.
  - Made the column `payload` on table `webhook_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "jules_tasks_githubRepoId_idx";

-- AlterTable
ALTER TABLE "jules_tasks" ADD COLUMN     "repoName" TEXT NOT NULL,
ADD COLUMN     "repoOwner" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "webhook_logs" DROP COLUMN "processingTime",
ALTER COLUMN "payload" SET NOT NULL,
ALTER COLUMN "payload" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "jules_tasks_repoOwner_repoName_idx" ON "jules_tasks"("repoOwner", "repoName");

-- CreateIndex
CREATE INDEX "jules_tasks_createdAt_idx" ON "jules_tasks"("createdAt");
