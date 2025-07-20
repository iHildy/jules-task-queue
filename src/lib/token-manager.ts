import { decrypt, encrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import logger from "@/lib/logger";

async function refreshUserToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  error?: string;
  error_description?: string;
}> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.NEXT_PUBLIC_GITHUB_APP_ID,
      client_secret: env.GITHUB_APP_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: env.GITHUB_APP_CALLBACK_URL,
    }),
  });
  return response.json();
}

export async function getUserAccessToken(
  installationId: number,
): Promise<string | null> {
  logger.info(
    `[TokenManager] Attempting to retrieve access token for installation: ${installationId}`,
  );
  const installation = await db.gitHubInstallation.findUnique({
    where: { id: installationId },
  });

  if (
    !installation ||
    !installation.user_access_token ||
    !installation.refresh_token
  ) {
    logger.warn(
      `[TokenManager] No token found for installation: ${installationId}`,
    );
    return null;
  }

  const decryptedRefreshToken = decrypt(installation.refresh_token);
  if (!decryptedRefreshToken) {
    logger.error(
      `[TokenManager] Failed to decrypt refresh token for installation: ${installationId}.`,
    );
    return null;
  }

  if (
    installation.token_expires_at &&
    installation.token_expires_at < new Date()
  ) {
    logger.info(
      `[TokenManager] Token expired for installation: ${installationId}. Refreshing...`,
    );
    try {
      const refreshed = await refreshUserToken(decryptedRefreshToken);
      if (refreshed.error) {
        logger.error(
          `[TokenManager] Error refreshing token for installation ${installationId}: ${refreshed.error_description}`,
        );
        if (refreshed.error === "bad_refresh_token") {
          logger.info(
            `[TokenManager] Refresh token is invalid. Clearing tokens for installation ${installationId}`,
          );
          await db.gitHubInstallation.update({
            where: { id: installationId },
            data: {
              user_access_token: null,
              refresh_token: null,
              token_expires_at: null,
              refresh_token_expires_at: null,
            },
          });
        }
        return null;
      }

      const {
        access_token,
        refresh_token,
        expires_in,
        refresh_token_expires_in,
      } = refreshed;

      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
      const refreshTokenExpiresAt = new Date(
        Date.now() + refresh_token_expires_in * 1000,
      );

      await db.gitHubInstallation.update({
        where: { id: installationId },
        data: {
          user_access_token: encrypt(access_token),
          refresh_token: encrypt(refresh_token),
          token_expires_at: tokenExpiresAt,
          refresh_token_expires_at: refreshTokenExpiresAt,
        },
      });
      logger.info(
        `[TokenManager] Successfully refreshed and stored new token for installation: ${installationId}`,
      );
      return access_token;
    } catch (error) {
      logger.error(
        { error },
        `[TokenManager] Failed to refresh user token for installation ${installationId}:`,
      );
      return null;
    }
  }

  const decryptedAccessToken = decrypt(installation.user_access_token);
  if (!decryptedAccessToken) {
    console.error(
      `[TokenManager] Failed to decrypt access token for installation: ${installationId}.`,
    );
    return null;
  }

  console.log(
    `[TokenManager] Successfully retrieved access token for installation: ${installationId}`,
  );
  return decryptedAccessToken;
}
