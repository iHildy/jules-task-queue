import { NextRequest, NextResponse } from "next/server";
import { githubClient } from "@/lib/github";
import { env } from "@/lib/env";

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
    // Silently fail, but indicate that the star requirement is met.
    // This prevents blocking users if the repo isn't configured.
    return NextResponse.json({ starred: true });
  }

  if (!installationId) {
    return NextResponse.json(
      { error: "Installation ID is required" },
      { status: 400 },
    );
  }

  try {
    const octokit = await githubClient.getUserOwnedGitHubAppClient(
      parseInt(installationId),
    );

    await githubClient.starRepository(octokit, owner, repo);
    const isStarred = await githubClient.checkIfRepositoryIsStarred(
      octokit,
      owner,
      repo,
    );

    return NextResponse.json({ starred: isStarred });
  } catch (error) {
    if ((error as { status?: number })?.status === 404) {
      return NextResponse.json(
        { error: "Repository not found. Please check configuration." },
        { status: 404 },
      );
    }
    console.error("Failed to check star status:", error);
    return NextResponse.json(
      { error: "Failed to check star status" },
      { status: 500 },
    );
  }
}
