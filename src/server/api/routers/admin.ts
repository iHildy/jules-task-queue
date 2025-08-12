import { installationService } from "@/lib/installation-service";
import {
  getFlaggedTasks,
  getTaskStats,
  retryAllFlaggedTasks,
} from "@/lib/jules";
import logger from "@/lib/logger";
import { getProcessingStats } from "@/lib/webhook-processor";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { z } from "zod";

// Type definitions for installation data
interface InstallationWithCounts {
  id: number;
  accountLogin: string;
  accountType: string;
  repositorySelection: string;
  createdAt: Date;
  updatedAt: Date;
  suspendedAt: Date | null;
  suspendedBy: string | null;
  _count: {
    repositories: number;
    tasks: number;
  };
}

interface InstallationRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  htmlUrl: string;
  description: string | null;
  addedAt: Date;
}

interface InstallationTask {
  id: number;
  githubIssueNumber: bigint;
  repoOwner: string;
  repoName: string;
  flaggedForRetry: boolean;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const adminRouter = createTRPCRouter({
  // Manually trigger retry for all flagged tasks
  retryAll: adminProcedure.mutation(async () => {
    try {
      const stats = await retryAllFlaggedTasks();

      return {
        success: true,
        message: `Retry completed: ${stats.successful} successful, ${stats.failed} failed, ${stats.skipped} skipped`,
        stats,
      };
    } catch (error) {
      logger.error({ error }, "Failed to retry all tasks");
      throw new Error(
        `Retry failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }),

  // Retry a specific task
  retryTask: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const { processTaskRetry } = await import("@/lib/jules");
        const success = await processTaskRetry(input.taskId);

        return {
          success,
          taskId: input.taskId,
          message: success
            ? `Task ${input.taskId} retried successfully`
            : `Task ${input.taskId} retry skipped or failed`,
        };
      } catch (error) {
        logger.error({ error }, `Failed to retry task ${input.taskId}`);
        throw new Error(
          `Retry failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }),

  // Get all flagged tasks
  flaggedTasks: adminProcedure.query(async () => {
    const tasks = await getFlaggedTasks();

    return {
      tasks: tasks.map(
        (task: {
          id: number;
          githubIssueNumber: bigint;
          repoOwner: string;
          repoName: string;
          retryCount: number;
          lastRetryAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }) => ({
          id: task.id,
          githubIssueNumber: Number(task.githubIssueNumber),
          repoOwner: task.repoOwner,
          repoName: task.repoName,
          retryCount: task.retryCount,
          lastRetryAt: task.lastRetryAt,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        }),
      ),
      count: tasks.length,
    };
  }),

  // View webhook logs with filtering
  logs: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().optional(),
        eventType: z.string().optional(),
        success: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, eventType, success } = input;

      const where = {
        ...(eventType && { eventType }),
        ...(success !== undefined && { success }),
      };

      const logs = await ctx.db.webhookLog.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (logs.length > limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        logs: logs.map(
          (log: {
            id: number;
            eventType: string;
            success: boolean;
            error: string | null;
            createdAt: Date;
            payload: string | null;
          }) => ({
            id: log.id,
            eventType: log.eventType,
            success: log.success,
            error: log.error,
            createdAt: log.createdAt,
            payload: log.payload ? JSON.parse(log.payload) : null,
          }),
        ),
        nextCursor,
      };
    }),

  // Get comprehensive system health and statistics
  health: adminProcedure.query(async ({ ctx }) => {
    try {
      const [taskStats, processingStats] = await Promise.all([
        getTaskStats(),
        getProcessingStats(),
      ]);

      return {
        database: {
          status: "connected",
          ...taskStats,
        },
        processing: processingStats,
        environment: ctx.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error }, "Failed to get admin health stats");
      throw new Error(
        `Health check failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }),

  // Clean up old tasks
  cleanup: adminProcedure
    .input(
      z.object({
        olderThanDays: z.number().min(1).max(365).default(30),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { cleanupOldTasks } = await import("@/lib/jules");
        const deletedCount = await cleanupOldTasks(input.olderThanDays);

        return {
          success: true,
          deletedCount,
          message: `Cleaned up ${deletedCount} tasks older than ${input.olderThanDays} days`,
        };
      } catch (error) {
        logger.error({ error }, "Failed to cleanup old tasks");
        throw new Error(
          `Cleanup failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }),

  // Get system performance metrics
  metrics: adminProcedure.query(async ({ ctx }) => {
    try {
      const [
        totalWebhooks,
        recentWebhooks,
        failedWebhooks,
        cronJobs,
        taskDistribution,
      ] = await Promise.all([
        ctx.db.webhookLog.count(),
        ctx.db.webhookLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
            },
          },
        }),
        ctx.db.webhookLog.count({
          where: {
            success: false,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
            },
          },
        }),
        ctx.db.webhookLog.count({
          where: {
            eventType: { startsWith: "cron_" },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
            },
          },
        }),
        ctx.db.julesTask.groupBy({
          by: ["flaggedForRetry"],
          _count: true,
        }),
      ]);

      return {
        webhooks: {
          total: totalWebhooks,
          recent24h: recentWebhooks,
          failed24h: failedWebhooks,
          successRate:
            recentWebhooks > 0
              ? ((recentWebhooks - failedWebhooks) / recentWebhooks) * 100
              : 100,
        },
        cronJobs: {
          executions24h: cronJobs,
        },
        tasks: {
          distribution: taskDistribution.reduce(
            (
              acc: Record<string, number>,
              item: { flaggedForRetry: boolean; _count: number },
            ) => {
              acc[item.flaggedForRetry ? "queued" : "active"] = item._count;
              return acc;
            },
            { active: 0, queued: 0 } as Record<string, number>,
          ),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error }, "Failed to get admin metrics");
      throw new Error(
        `Metrics failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }),

  // Installation management endpoints
  installations: createTRPCRouter({
    // Get all installations
    list: adminProcedure.query(async () => {
      const installations = await installationService.getActiveInstallations();

      return {
        installations: installations.map(
          (installation: InstallationWithCounts) => ({
            id: installation.id,
            accountLogin: installation.accountLogin,
            accountType: installation.accountType,
            repositorySelection: installation.repositorySelection,
            repositoryCount: installation._count.repositories,
            taskCount: installation._count.tasks,
            createdAt: installation.createdAt,
            updatedAt: installation.updatedAt,
            suspendedAt: installation.suspendedAt,
            suspendedBy: installation.suspendedBy,
          }),
        ),
        count: installations.length,
      };
    }),

    // Get installation details
    detail: adminProcedure
      .input(z.object({ installationId: z.number() }))
      .query(async ({ input }) => {
        const installation = await installationService.getInstallation(
          input.installationId,
        );

        if (!installation) {
          throw new Error(`Installation ${input.installationId} not found`);
        }

        return {
          id: installation.id,
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
          targetType: installation.targetType,
          repositorySelection: installation.repositorySelection,
          permissions: JSON.parse(installation.permissions),
          events: JSON.parse(installation.events),
          singleFileName: installation.singleFileName,
          createdAt: installation.createdAt,
          updatedAt: installation.updatedAt,
          suspendedAt: installation.suspendedAt,
          suspendedBy: installation.suspendedBy,
          repositories: installation.repositories.map(
            (repo: InstallationRepository) => ({
              id: repo.id,
              name: repo.name,
              fullName: repo.fullName,
              owner: repo.owner,
              private: repo.private,
              htmlUrl: repo.htmlUrl,
              description: repo.description,
              addedAt: repo.addedAt,
            }),
          ),
          tasks: installation.tasks.map((task: InstallationTask) => ({
            id: task.id,
            githubIssueNumber: Number(task.githubIssueNumber),
            repoOwner: task.repoOwner,
            repoName: task.repoName,
            flaggedForRetry: task.flaggedForRetry,
            retryCount: task.retryCount,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          })),
        };
      }),

    // Sync installation with GitHub
    sync: adminProcedure
      .input(z.object({ installationId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const result = await installationService.syncInstallation(
            input.installationId,
          );

          return {
            success: true,
            installationId: input.installationId,
            message: result
              ? `Installation ${input.installationId} synced successfully`
              : `Installation ${input.installationId} was suspended (not found in GitHub)`,
            data: result,
          };
        } catch (error) {
          logger.error(
            { error },
            `Failed to sync installation ${input.installationId}`,
          );
          throw new Error(
            `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }),

    // Sync all installations
    syncAll: adminProcedure.mutation(async () => {
      try {
        const results = await installationService.syncAllInstallations();
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        return {
          success: true,
          message: `Sync completed: ${successful} successful, ${failed} failed`,
          results,
          stats: { successful, failed, total: results.length },
        };
      } catch (error) {
        logger.error({ error }, "Failed to sync all installations");
        throw new Error(
          `Sync all failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

    // Get installation health
    health: adminProcedure
      .input(z.object({ installationId: z.number() }))
      .query(async ({ input }) => {
        return installationService.getInstallationHealth(input.installationId);
      }),

    // Get installation statistics
    stats: adminProcedure.query(async () => {
      return installationService.getInstallationStats();
    }),

    // Clean up old suspended installations
    cleanup: adminProcedure
      .input(
        z.object({ olderThanDays: z.number().min(1).max(365).default(30) }),
      )
      .mutation(async ({ input }) => {
        try {
          const deletedCount =
            await installationService.cleanupSuspendedInstallations(
              input.olderThanDays,
            );

          return {
            success: true,
            deletedCount,
            message: `Cleaned up ${deletedCount} suspended installations older than ${input.olderThanDays} days`,
          };
        } catch (error) {
          logger.error({ error }, "Failed to cleanup suspended installations");
          throw new Error(
            `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }),
  }),
});
