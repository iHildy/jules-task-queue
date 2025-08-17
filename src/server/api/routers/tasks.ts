import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const tasksRouter = createTRPCRouter({
  // List tasks with filtering and pagination
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().optional(), // for pagination
        flaggedForRetry: z.boolean().optional(),
        githubRepoId: z.bigint().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, flaggedForRetry, githubRepoId } = input;

      const where = {
        ...(flaggedForRetry !== undefined && { flaggedForRetry }),
        ...(githubRepoId !== undefined && { githubRepoId }),
      };

      const tasks = await ctx.db.julesTask.findMany({
        where,
        take: limit + 1, // get one extra for cursor pagination
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (tasks.length > limit) {
        const nextItem = tasks.pop(); // remove extra item
        nextCursor = nextItem?.id;
      }

      return {
        tasks,
        nextCursor,
      };
    }),

  // Get public project statistics
  publicStats: publicProcedure.query(async ({ ctx }) => {
    const [
      totalTasks,
      totalRetries,
      queuedTasks,
      activeTasks,
      totalInstallations,
      totalRepositories,
    ] = await Promise.all([
      // Total tasks ever created
      ctx.db.julesTask.count(),

      // Total retry count across all tasks
      ctx.db.julesTask.aggregate({
        _sum: { retryCount: true },
      }),

      // Currently queued tasks (flagged for retry)
      ctx.db.julesTask.count({
        where: { flaggedForRetry: true },
      }),

      // Active tasks (created in last 24 hours, not flagged for retry)
      ctx.db.julesTask.count({
        where: {
          flaggedForRetry: false,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
          },
        },
      }),

      // Total GitHub installations
      ctx.db.gitHubInstallation.count({
        where: {
          suspendedAt: null, // only active installations
        },
      }),

      // Total repositories with active installations
      ctx.db.installationRepository.count({
        where: {
          removedAt: null, // only active repositories
        },
      }),
    ]);

    return {
      totalTasks,
      totalRetries: totalRetries._sum.retryCount ?? 0,
      queuedTasks,
      activeTasks,
      totalInstallations,
      totalRepositories,
    };
  }),

  // Manual retry of a specific task
  retry: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.julesTask.findUnique({
        where: { id: input.id },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      // Update task to be retried
      const updatedTask = await ctx.db.julesTask.update({
        where: { id: input.id },
        data: {
          flaggedForRetry: true,
          retryCount: task.retryCount + 1,
          lastRetryAt: new Date(),
        },
      });

      return updatedTask;
    }),

  // Update task status
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        flaggedForRetry: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const updatedTask = await ctx.db.julesTask.update({
        where: { id },
        data: updateData,
      });

      return updatedTask;
    }),
});
