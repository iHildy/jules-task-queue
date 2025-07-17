-- CreateTable
CREATE TABLE "label_preferences" (
    "id" SERIAL NOT NULL,
    "installationId" INTEGER NOT NULL,
    "setupType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "label_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_preference_repositories" (
    "id" SERIAL NOT NULL,
    "labelPreferenceId" INTEGER NOT NULL,
    "repositoryId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "label_preference_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "label_preferences_installationId_idx" ON "label_preferences"("installationId");

-- CreateIndex
CREATE INDEX "label_preferences_setupType_idx" ON "label_preferences"("setupType");

-- CreateIndex
CREATE UNIQUE INDEX "label_preferences_installationId_key" ON "label_preferences"("installationId");

-- CreateIndex
CREATE INDEX "label_preference_repositories_labelPreferenceId_idx" ON "label_preference_repositories"("labelPreferenceId");

-- CreateIndex
CREATE INDEX "label_preference_repositories_repositoryId_idx" ON "label_preference_repositories"("repositoryId");

-- CreateIndex
CREATE INDEX "label_preference_repositories_owner_name_idx" ON "label_preference_repositories"("owner", "name");

-- CreateIndex
CREATE UNIQUE INDEX "label_preference_repositories_labelPreferenceId_repositoryI_key" ON "label_preference_repositories"("labelPreferenceId", "repositoryId");

-- AddForeignKey
ALTER TABLE "label_preferences" ADD CONSTRAINT "label_preferences_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "github_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_preference_repositories" ADD CONSTRAINT "label_preference_repositories_labelPreferenceId_fkey" FOREIGN KEY ("labelPreferenceId") REFERENCES "label_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
