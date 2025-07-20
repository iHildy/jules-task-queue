-- AlterTable
ALTER TABLE "github_installations" ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "token_expires_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limits_identifier_idx" ON "rate_limits"("identifier");

-- CreateIndex
CREATE INDEX "rate_limits_endpoint_idx" ON "rate_limits"("endpoint");

-- CreateIndex
CREATE INDEX "rate_limits_expiresAt_idx" ON "rate_limits"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_identifier_endpoint_key" ON "rate_limits"("identifier", "endpoint");
