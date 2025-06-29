import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
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
      })
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

  // Get task statistics
  stats: publicProcedure.query(async ({ ctx }) => {
    const [totalTasks, queuedTasks, activeTasks, completedToday] =
      await Promise.all([
        // Total tasks
        ctx.db.julesTask.count(),

        // Queued tasks (flagged for retry)
        ctx.db.julesTask.count({
          where: { flaggedForRetry: true },
        }),

        // Active tasks (created in last hour, not flagged for retry)
        ctx.db.julesTask.count({
          where: {
            flaggedForRetry: false,
            createdAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000), // last hour
            },
          },
        }),

        // Completed today (approximate - tasks that were retried today)
        ctx.db.julesTask.count({
          where: {
            lastRetryAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)), // start of today
            },
          },
        }),
      ]);

    return {
      totalTasks,
      queuedTasks,
      activeTasks,
      completedToday,
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
        throw new Error("Task not found");
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
      })
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
