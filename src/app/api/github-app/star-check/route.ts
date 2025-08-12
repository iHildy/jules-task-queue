import { decrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { githubClient } from "@/lib/github";
import logger from "@/lib/logger";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const installationId = searchParams.get("installation_id");

  if (env.STAR_REQUIREMENT !== "true") {
    return NextResponse.json({ starred: true });
  }

  const owner = env.REPO_OWNER;
  const repo = env.REPO_NAME;

  if (!owner || !repo) {
    logger.error("REPO_OWNER or REPO_NAME environment variables not set.");
    return NextResponse.json(
      {
        error: "Star requirement configuration incomplete",
        message:
          "REPO_OWNER and REPO_NAME must be configured when STAR_REQUIREMENT is enabled.",
      },
      { status: 500 },
    );
  }

  if (!installationId) {
    return NextResponse.json(
      { error: "Installation ID is required" },
      { status: 400 },
    );
  }

  // Validate installationId is a valid numeric string
  const parsedInstallationId = parseInt(installationId, 10);
  if (isNaN(parsedInstallationId) || parsedInstallationId <= 0) {
    return NextResponse.json(
      { error: "Invalid installation ID format" },
      { status: 400 },
    );
  }

  try {
    // Get the installation info from our database instead of GitHub API
    const installation = await db.gitHubInstallation.findUnique({
      where: { id: parsedInstallationId },
      select: {
        accountLogin: true,
        accountType: true,
        userAccessToken: true,
      },
    });

    if (!installation) {
      return NextResponse.json(
        { error: "Installation not found" },
        { status: 404 },
      );
    }

    if (!installation.userAccessToken) {
      // User access token is missing, redirect to OAuth flow
      // Check if we're already in an OAuth flow (GitHub might have initiated it)
      const baseUrl = new URL(env.GITHUB_APP_CALLBACK_URL).origin;
      const oauthUrl = new URL("/api/auth/authorize/github", baseUrl);
      oauthUrl.searchParams.set("installation_id", installationId);
      oauthUrl.searchParams.set("redirect_to", "/github-app/success");

      return NextResponse.json(
        {
          error: "oauth_required",
          message:
            "User authorization required. Please complete the OAuth flow.",
          oauth_url: oauthUrl.toString(),
        },
        { status: 401 },
      );
    }

    // Use the account login from our database
    const username = installation.accountLogin;

    // Decrypt the user access token with proper error handling
    let decryptedToken: string | null = null;
    try {
      decryptedToken = decrypt(installation.userAccessToken);
    } catch (decryptError) {
      logger.error(
        { error: decryptError },
        "Failed to decrypt user access token",
      );
      return NextResponse.json(
        {
          error: "token_decryption_failed",
          message:
            "Failed to decrypt user access token. Please reinstall the app.",
        },
        { status: 500 },
      );
    }

    if (!decryptedToken) {
      logger.error("Failed to decrypt user access token");
      return NextResponse.json(
        {
          error: "token_decryption_failed",
          message:
            "Failed to decrypt user access token. Please reinstall the app.",
        },
        { status: 500 },
      );
    }

    // Create an Octokit client using the user access token
    const octokit =
      await githubClient.getUserOwnedGitHubAppClient(decryptedToken);

    // Check if the user has starred the repository (passive check)
    const isStarred = await githubClient.checkIfUserStarredRepository(
      octokit,
      username,
      owner,
      repo,
    );

    return NextResponse.json({ starred: isStarred });
  } catch (error) {
    if ((error as { status?: number })?.status === 404) {
      // This could be either:
      // 1. Repository not found
      // 2. Installation not found (app was uninstalled/reinstalled)
      const errorMessage = (error as Error)?.message || "";
      if (
        errorMessage.includes("installation") ||
        errorMessage.includes("Installation")
      ) {
        logger.error(
          { error },
          "Installation not found (may be uninstalled/reinstalled)",
        );
        return NextResponse.json(
          {
            error: "Installation not found",
            message:
              "The GitHub App installation is no longer valid. Please try reinstalling the app.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Repository not found. Please check configuration." },
        { status: 404 },
      );
    }

    // Handle permission errors specifically
    if ((error as { status?: number })?.status === 403) {
      logger.error({ error }, "GitHub App lacks required permissions");
      return NextResponse.json(
        {
          error: "Permission denied",
          message:
            "The GitHub App requires 'Starring' user permission with read access to check starred repositories.",
        },
        { status: 403 },
      );
    }

    logger.error({ error }, "Failed to check star status");
    return NextResponse.json(
      { error: "Failed to check star status" },
      { status: 500 },
    );
  }
}
