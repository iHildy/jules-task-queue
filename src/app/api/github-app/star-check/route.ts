import { env } from "@/lib/env";
import { githubClient } from "@/lib/github";
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
    console.error("REPO_OWNER or REPO_NAME environment variables not set.");
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

  try {
    // Get the installation info to get the username
    const installationInfo = await githubClient
      .getGitHubAppClient()
      .getInstallationInfo(parseInt(installationId));

    if (!installationInfo.account) {
      return NextResponse.json(
        { error: "Unable to determine user account from installation" },
        { status: 400 },
      );
    }

    // Handle both User and Organization accounts
    const username =
      "login" in installationInfo.account
        ? installationInfo.account.login
        : installationInfo.account.name;

    // Get an installation-scoped Octokit client
    const octokit = await githubClient.getUserOwnedGitHubAppClient(
      parseInt(installationId),
    );

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
        console.error(
          "Installation not found (app may have been uninstalled/reinstalled):",
          error,
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
      console.error("GitHub App lacks required permissions:", error);
      return NextResponse.json(
        {
          error: "Permission denied",
          message:
            "The GitHub App requires 'Starring' user permission with read access to check starred repositories.",
        },
        { status: 403 },
      );
    }

    console.error("Failed to check star status:", error);
    return NextResponse.json(
      { error: "Failed to check star status" },
      { status: 500 },
    );
  }
}
