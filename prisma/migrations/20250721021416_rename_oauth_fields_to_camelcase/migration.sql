/*
  Warnings:

  - You are about to drop the column `refresh_token` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token_expires_at` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `token_expires_at` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `user_access_token` on the `github_installations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "github_installations" DROP COLUMN "refresh_token",
DROP COLUMN "refresh_token_expires_at",
DROP COLUMN "token_expires_at",
DROP COLUMN "user_access_token",
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "userAccessToken" TEXT;
