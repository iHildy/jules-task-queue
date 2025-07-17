import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ installationId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { installationId: installationIdStr } = await context.params;
    const installationId = parseInt(installationIdStr);

    if (isNaN(installationId)) {
      return NextResponse.json(
        { error: "Invalid installation ID" },
        { status: 400 },
      );
    }

    // Verify installation exists
    const installation = await db.gitHubInstallation.findUnique({
      where: { id: installationId },
    });

    if (!installation) {
      return NextResponse.json(
        { error: "Installation not found" },
        { status: 404 },
      );
    }

    // Get repositories for this installation
    const repositories = await db.installationRepository.findMany({
      where: {
        installationId,
        removedAt: null, // Only active repositories
      },
      select: {
        repositoryId: true,
        name: true,
        fullName: true,
        owner: true,
        private: true,
        description: true,
        htmlUrl: true,
      },
      orderBy: [{ name: "asc" }],
    });

    // Convert BigInt to number for JSON serialization
    const formattedRepositories = repositories.map((repo) => ({
      ...repo,
      id: Number(repo.repositoryId),
      repositoryId: undefined, // Remove the BigInt field
    }));

    return NextResponse.json({
      installation: {
        id: installation.id,
        accountLogin: installation.accountLogin,
        accountType: installation.accountType,
      },
      repositories: formattedRepositories,
      count: formattedRepositories.length,
    });
  } catch (error) {
    console.error("Failed to fetch installation repositories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
