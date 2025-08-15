import { createJulesLabelsForRepository } from "@/lib/github-labels";
import logger from "@/lib/logger";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LabelSetupSchema = z.object({
  installationId: z.number(),
  setupType: z.enum(["all", "selected", "manual"]),
  repositoryIds: z.array(z.number()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { installationId, setupType, repositoryIds } =
      LabelSetupSchema.parse(body);

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

    // Get repositories to process
    let repositoriesToProcess: {
      id: number;
      name: string;
      fullName: string;
      owner: string;
    }[] = [];

    if (setupType === "all") {
      // Get all active repositories for this installation
      const allRepos = await db.installationRepository.findMany({
        where: {
          installationId,
          removedAt: null,
        },
        select: {
          repositoryId: true,
          name: true,
          fullName: true,
          owner: true,
        },
      });
      repositoriesToProcess = allRepos.map((repo) => ({
        id: Number(repo.repositoryId),
        name: repo.name,
        fullName: repo.fullName,
        owner: repo.owner,
      }));
    } else if (setupType === "selected" && repositoryIds) {
      // Get selected repositories
      const selectedRepos = await db.installationRepository.findMany({
        where: {
          installationId,
          repositoryId: { in: repositoryIds.map((id) => BigInt(id)) },
          removedAt: null,
        },
        select: {
          repositoryId: true,
          name: true,
          fullName: true,
          owner: true,
        },
      });
      repositoriesToProcess = selectedRepos.map((repo) => ({
        id: Number(repo.repositoryId),
        name: repo.name,
        fullName: repo.fullName,
        owner: repo.owner,
      }));
    }

    // Save label preference to database
    const labelPreference = await db.labelPreference.upsert({
      where: { installationId },
      update: {
        setupType,
        updatedAt: new Date(),
      },
      create: {
        installationId,
        setupType,
      },
    });

    // Clear existing repository preferences
    await db.labelPreferenceRepository.deleteMany({
      where: { labelPreferenceId: labelPreference.id },
    });

    // Save repository preferences if not manual
    if (setupType !== "manual" && repositoriesToProcess.length > 0) {
      await db.labelPreferenceRepository.createMany({
        data: repositoriesToProcess.map((repo) => ({
          labelPreferenceId: labelPreference.id,
          repositoryId: BigInt(repo.id),
          name: repo.name,
          fullName: repo.fullName,
          owner: repo.owner,
        })),
      });

      // Create labels in selected repositories
      logger.info(
        `Creating Jules labels in ${repositoriesToProcess.length} repositories for installation ${installationId}`,
      );

      const labelCreationResults = await Promise.allSettled(
        repositoriesToProcess.map((repo) =>
          createJulesLabelsForRepository(repo.owner, repo.name, installationId),
        ),
      );

      const successful = labelCreationResults.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failed = labelCreationResults.filter(
        (result) => result.status === "rejected",
      ).length;

      logger.info(
        `Label creation completed: ${successful} successful, ${failed} failed`,
      );

      return NextResponse.json({
        success: true,
        setupType,
        repositoriesProcessed: repositoriesToProcess.length,
        labelsCreated: {
          successful,
          failed,
        },
        preference: {
          id: labelPreference.id,
          installationId,
          setupType,
        },
      });
    }

    // Manual setup - no label creation
    return NextResponse.json({
      success: true,
      setupType: "manual",
      repositoriesProcessed: 0,
      preference: {
        id: labelPreference.id,
        installationId,
        setupType,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to setup labels");

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
