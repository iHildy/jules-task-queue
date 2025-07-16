import { NextRequest, NextResponse } from "next/server";
import { githubClient } from "@/lib/github";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const installationId = searchParams.get("installation_id");

  if (env.STAR_REQUIREMENT !== "true") {
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
    const owner = env.REPO_OWNER;
    const repo = env.REPO_NAME;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Repo owner and name are not configured" },
        { status: 500 },
      );
    }

    await githubClient.starRepository(octokit, owner, repo);
    const isStarred = await githubClient.checkIfRepositoryIsStarred(
      octokit,
      owner,
      repo,
    );

    return NextResponse.json({ starred: isStarred });
  } catch (error) {
    console.error("Failed to check star status:", error);
    return NextResponse.json(
      { error: "Failed to check star status" },
      { status: 500 },
    );
  }
}
