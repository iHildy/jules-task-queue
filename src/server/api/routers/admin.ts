import {
  getFlaggedTasks,
  getTaskStats,
  retryAllFlaggedTasks,
} from "@/lib/jules";
import { getProcessingStats } from "@/lib/webhook-processor";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { z } from "zod";

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
      console.error("Failed to retry all tasks:", error);
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
        console.error(`Failed to retry task ${input.taskId}:`, error);
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
      tasks: tasks.map((task) => ({
        id: task.id,
        githubIssueNumber: Number(task.githubIssueNumber),
        repoOwner: task.repoOwner,
        repoName: task.repoName,
        retryCount: task.retryCount,
        lastRetryAt: task.lastRetryAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
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
        logs: logs.map((log) => ({
          id: log.id,
          eventType: log.eventType,
          success: log.success,
          error: log.error,
          createdAt: log.createdAt,
          payload: log.payload ? JSON.parse(log.payload) : null,
        })),
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
      console.error("Failed to get admin health stats:", error);
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
        console.error("Failed to cleanup old tasks:", error);
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
            (acc, item) => {
              acc[item.flaggedForRetry ? "queued" : "active"] = item._count;
              return acc;
            },
            { active: 0, queued: 0 } as Record<string, number>,
          ),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to get admin metrics:", error);
      throw new Error(
        `Metrics failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }),
});
