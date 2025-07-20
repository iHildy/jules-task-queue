-- AlterTable
ALTER TABLE "github_installations" ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "refresh_token_expires_at" TIMESTAMPTZ,
ADD COLUMN     "token_expires_at" TIMESTAMPTZ,
ADD COLUMN     "user_access_token" TEXT;
