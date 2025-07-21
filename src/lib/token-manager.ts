import { decrypt, encrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import logger from "@/lib/logger";
import { db } from "@/server/db";

// Discriminated union type for GitHub token responses
type GitHubTokenSuccessResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
};

type GitHubTokenErrorResponse = {
  error: string;
  error_description?: string;
  error_uri?: string;
};

type GitHubTokenResponse =
  | GitHubTokenSuccessResponse
  | GitHubTokenErrorResponse;

async function refreshUserToken(
  refreshToken: string,
): Promise<GitHubTokenResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.NEXT_PUBLIC_GITHUB_APP_ID,
          client_secret: env.GITHUB_APP_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate the response structure
    if (data.error) {
      // This is an error response
      return {
        error: data.error,
        error_description: data.error_description,
        error_uri: data.error_uri,
      };
    }

    // Validate success response has required fields
    if (
      !data.access_token ||
      !data.refresh_token ||
      typeof data.expires_in !== "number" ||
      typeof data.refresh_token_expires_in !== "number"
    ) {
      throw new Error("Invalid token response: missing required fields");
    }

    // This is a success response
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      refresh_token_expires_in: data.refresh_token_expires_in,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      logger.error({ error }, "Token refresh request timed out");
      throw new Error("Token refresh request timed out");
    }

    logger.error({ error }, "Failed to refresh user token");
    throw error;
  }
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
    !installation.userAccessToken ||
    !installation.refreshToken
  ) {
    logger.warn(
      `[TokenManager] No token found for installation: ${installationId}`,
    );
    return null;
  }

  const decryptedRefreshToken = decrypt(installation.refreshToken);
  if (!decryptedRefreshToken) {
    logger.error(
      `[TokenManager] Failed to decrypt refresh token for installation: ${installationId}.`,
    );
    return null;
  }

  if (installation.tokenExpiresAt && installation.tokenExpiresAt < new Date()) {
    logger.info(
      `[TokenManager] Token expired for installation: ${installationId}. Refreshing...`,
    );
    try {
      const refreshed = await refreshUserToken(decryptedRefreshToken);

      // Check if this is an error response
      if ("error" in refreshed) {
        logger.error(
          `[TokenManager] Error refreshing token for installation ${installationId}: ${refreshed.error_description || refreshed.error}`,
        );
        if (refreshed.error === "bad_refresh_token") {
          logger.info(
            `[TokenManager] Refresh token is invalid. Clearing tokens for installation ${installationId}`,
          );
          await db.gitHubInstallation.update({
            where: { id: installationId },
            data: {
              userAccessToken: null,
              refreshToken: null,
              tokenExpiresAt: null,
              refreshTokenExpiresAt: null,
            },
          });
        }
        return null;
      }

      // This is a success response - validate before destructuring
      if (
        !refreshed.access_token ||
        !refreshed.refresh_token ||
        typeof refreshed.expires_in !== "number" ||
        typeof refreshed.refresh_token_expires_in !== "number"
      ) {
        logger.error(
          `[TokenManager] Invalid token response structure for installation ${installationId}`,
        );
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
          userAccessToken: encrypt(access_token),
          refreshToken: encrypt(refresh_token),
          tokenExpiresAt: tokenExpiresAt,
          refreshTokenExpiresAt: refreshTokenExpiresAt,
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

  const decryptedAccessToken = decrypt(installation.userAccessToken);
  if (!decryptedAccessToken) {
    logger.error(
      `[TokenManager] Failed to decrypt access token for installation: ${installationId}.`,
    );
    return null;
  }

  logger.info(
    `[TokenManager] Successfully retrieved access token for installation: ${installationId}`,
  );
  return decryptedAccessToken;
}
