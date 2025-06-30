-- CreateTable
CREATE TABLE "github_installations" (
    "id" INTEGER NOT NULL,
    "accountId" BIGINT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "singleFileName" TEXT,
    "repositorySelection" TEXT NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "suspendedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation_repositories" (
    "id" SERIAL NOT NULL,
    "installationId" INTEGER NOT NULL,
    "repositoryId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "description" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "installation_repositories_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "jules_tasks" ADD COLUMN "installationId" INTEGER;

-- CreateIndex
CREATE INDEX "github_installations_accountId_idx" ON "github_installations"("accountId");

-- CreateIndex
CREATE INDEX "github_installations_accountLogin_idx" ON "github_installations"("accountLogin");

-- CreateIndex
CREATE INDEX "github_installations_suspendedAt_idx" ON "github_installations"("suspendedAt");

-- CreateIndex
CREATE UNIQUE INDEX "installation_repositories_installationId_repositoryId_key" ON "installation_repositories"("installationId", "repositoryId");

-- CreateIndex
CREATE INDEX "installation_repositories_installationId_idx" ON "installation_repositories"("installationId");

-- CreateIndex
CREATE INDEX "installation_repositories_repositoryId_idx" ON "installation_repositories"("repositoryId");

-- CreateIndex
CREATE INDEX "installation_repositories_owner_name_idx" ON "installation_repositories"("owner", "name");

-- CreateIndex
CREATE INDEX "installation_repositories_removedAt_idx" ON "installation_repositories"("removedAt");

-- CreateIndex
CREATE INDEX "jules_tasks_installationId_idx" ON "jules_tasks"("installationId");

-- AddForeignKey
ALTER TABLE "jules_tasks" ADD CONSTRAINT "jules_tasks_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "github_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_repositories" ADD CONSTRAINT "installation_repositories_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "github_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;