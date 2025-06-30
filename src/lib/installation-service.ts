import { db } from "@/server/db";
import { githubAppClient } from "@/lib/github-app";

/**
 * Service for managing GitHub App installations
 */
export class InstallationService {
  private static instance: InstallationService;

  private constructor() {}

  public static getInstance(): InstallationService {
    if (!InstallationService.instance) {
      InstallationService.instance = new InstallationService();
    }
    return InstallationService.instance;
  }

  /**
   * Get all active installations
   */
  async getActiveInstallations() {
    return db.gitHubInstallation.findMany({
      where: {
        suspendedAt: null,
      },
      include: {
        repositories: {
          where: {
            removedAt: null,
          },
        },
        _count: {
          select: {
            repositories: {
              where: {
                removedAt: null,
              },
            },
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get installation by ID
   */
  async getInstallation(installationId: number) {
    return db.gitHubInstallation.findUnique({
      where: { id: installationId },
      include: {
        repositories: {
          where: {
            removedAt: null,
          },
        },
        tasks: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Latest 10 tasks
        },
      },
    });
  }

  /**
   * Check if repository is accessible through any installation
   */
  async isRepositoryAccessible(owner: string, repo: string): Promise<boolean> {
    const repository = await db.installationRepository.findFirst({
      where: {
        owner,
        name: repo,
        removedAt: null,
        installation: {
          suspendedAt: null,
        },
      },
    });

    return repository !== null;
  }

  /**
   * Get installation for a specific repository
   */
  async getInstallationForRepository(owner: string, repo: string) {
    const repository = await db.installationRepository.findFirst({
      where: {
        owner,
        name: repo,
        removedAt: null,
        installation: {
          suspendedAt: null,
        },
      },
      include: {
        installation: true,
      },
    });

    return repository?.installation || null;
  }

  /**
   * Sync installation data with GitHub
   */
  async syncInstallation(installationId: number) {
    try {
      console.log(`Syncing installation ${installationId} with GitHub`);

      // Check if installation exists in GitHub
      const installations = await githubAppClient.getInstallations();
      const githubInstallation = installations.find((inst: { id: number }) => inst.id === installationId);

      if (!githubInstallation || !githubInstallation.account) {
        // Installation was removed from GitHub or has no account, mark as suspended
        await db.gitHubInstallation.update({
          where: { id: installationId },
          data: {
            suspendedAt: new Date(),
            suspendedBy: 'github_sync',
            updatedAt: new Date(),
          },
        });

        // Mark all repositories as removed
        await db.installationRepository.updateMany({
          where: { installationId },
          data: { removedAt: new Date() },
        });

        console.log(`Installation ${installationId} marked as suspended (not found in GitHub or missing account)`);
        return null;
      }

      // Update installation data
      await db.gitHubInstallation.upsert({
        where: { id: installationId },
        update: {
          accountId: BigInt(githubInstallation.account.id),
          accountLogin: githubInstallation.account.login,
          accountType: githubInstallation.account.type,
          targetType: githubInstallation.target_type,
          permissions: JSON.stringify(githubInstallation.permissions),
          events: JSON.stringify(githubInstallation.events),
          singleFileName: githubInstallation.single_file_name,
          repositorySelection: githubInstallation.repository_selection,
          suspendedAt: githubInstallation.suspended_at ? new Date(githubInstallation.suspended_at) : null,
          suspendedBy: githubInstallation.suspended_by?.login,
          updatedAt: new Date(),
        },
        create: {
          id: installationId,
          accountId: BigInt(githubInstallation.account.id),
          accountLogin: githubInstallation.account.login,
          accountType: githubInstallation.account.type,
          targetType: githubInstallation.target_type,
          permissions: JSON.stringify(githubInstallation.permissions),
          events: JSON.stringify(githubInstallation.events),
          singleFileName: githubInstallation.single_file_name,
          repositorySelection: githubInstallation.repository_selection,
          suspendedAt: githubInstallation.suspended_at ? new Date(githubInstallation.suspended_at) : null,
          suspendedBy: githubInstallation.suspended_by?.login,
        },
      });

      // Sync repositories
      const githubRepositories = await githubAppClient.getInstallationRepositories(installationId);
      
      // Mark all existing repositories as potentially removed
      await db.installationRepository.updateMany({
        where: { installationId },
        data: { removedAt: new Date() },
      });

      // Add/update repositories from GitHub
      for (const repo of githubRepositories) {
        await db.installationRepository.upsert({
          where: {
            installationId_repositoryId: {
              installationId,
              repositoryId: BigInt(repo.id),
            },
          },
          update: {
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            private: repo.private,
            htmlUrl: repo.html_url,
            description: repo.description,
            removedAt: null, // Reset removal
          },
          create: {
            installationId,
            repositoryId: BigInt(repo.id),
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            private: repo.private,
            htmlUrl: repo.html_url,
            description: repo.description,
          },
        });
      }

      console.log(`Synced installation ${installationId}: ${githubRepositories.length} repositories`);
      return await this.getInstallation(installationId);

    } catch (error) {
      console.error(`Failed to sync installation ${installationId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all installations with GitHub
   */
  async syncAllInstallations() {
    const installations = await this.getActiveInstallations();
    const results = [];

    for (const installation of installations) {
      try {
        const synced = await this.syncInstallation(installation.id);
        results.push({ installationId: installation.id, success: true, data: synced });
      } catch (error) {
        console.error(`Failed to sync installation ${installation.id}:`, error);
        results.push({ 
          installationId: installation.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return results;
  }

  /**
   * Get installation health status
   */
  async getInstallationHealth(installationId: number) {
    const installation = await this.getInstallation(installationId);
    if (!installation) {
      return { status: 'not_found', installationId };
    }

    const health = {
      installationId,
      status: installation.suspendedAt ? 'suspended' : 'active',
      accountLogin: installation.accountLogin,
      repositoryCount: installation.repositories.length,
      taskCount: installation.tasks.length,
      lastUpdated: installation.updatedAt,
      suspendedAt: installation.suspendedAt,
      suspendedBy: installation.suspendedBy,
    };

    // Check if we can access the installation in GitHub
    try {
      await githubAppClient.getInstallationRepositories(installationId);
      health.status = installation.suspendedAt ? 'suspended' : 'healthy';
    } catch {
      health.status = 'github_error';
    }

    return health;
  }

  /**
   * Get installation statistics
   */
  async getInstallationStats() {
    const [
      totalInstallations,
      activeInstallations,
      suspendedInstallations,
      totalRepositories,
      totalTasks,
      recentInstallations,
    ] = await Promise.all([
      db.gitHubInstallation.count(),
      db.gitHubInstallation.count({
        where: { suspendedAt: null },
      }),
      db.gitHubInstallation.count({
        where: { suspendedAt: { not: null } },
      }),
      db.installationRepository.count({
        where: { removedAt: null },
      }),
      db.julesTask.count(),
      db.gitHubInstallation.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    return {
      totalInstallations,
      activeInstallations,
      suspendedInstallations,
      totalRepositories,
      totalTasks,
      recentInstallations,
      healthyPercentage: totalInstallations > 0 
        ? Math.round((activeInstallations / totalInstallations) * 100) 
        : 0,
    };
  }

  /**
   * Clean up old suspended installations
   */
  async cleanupSuspendedInstallations(olderThanDays: number = 30) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    // Find installations suspended longer than cutoff
    const suspendedInstallations = await db.gitHubInstallation.findMany({
      where: {
        suspendedAt: {
          lte: cutoffDate,
        },
      },
      select: { id: true },
    });

    // Delete associated repositories first (due to foreign key constraints)
    for (const installation of suspendedInstallations) {
      await db.installationRepository.deleteMany({
        where: { installationId: installation.id },
      });
    }

    // Delete the installations
    const deletedCount = await db.gitHubInstallation.deleteMany({
      where: {
        suspendedAt: {
          lte: cutoffDate,
        },
      },
    });

    console.log(`Cleaned up ${deletedCount.count} suspended installations older than ${olderThanDays} days`);
    return deletedCount.count;
  }

  /**
   * Validate installation access for a repository
   */
  async validateRepositoryAccess(owner: string, repo: string, installationId?: number) {
    if (installationId) {
      // Check specific installation
      const repository = await db.installationRepository.findFirst({
        where: {
          installationId,
          owner,
          name: repo,
          removedAt: null,
          installation: {
            suspendedAt: null,
          },
        },
      });
      return repository !== null;
    } else {
      // Check any installation
      return this.isRepositoryAccessible(owner, repo);
    }
  }
}

// Export singleton instance
export const installationService = InstallationService.getInstance();