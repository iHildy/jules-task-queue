-- AlterTable
ALTER TABLE "github_installations" ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "refresh_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "token_expires_at" TIMESTAMP(3),
ADD COLUMN     "user_access_token" TEXT;
