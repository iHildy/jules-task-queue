import { adminRouter } from "./routers/admin";
import { tasksRouter } from "./routers/tasks";
import { webhookRouter } from "./routers/webhook";
import { createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  admin: adminRouter,
  webhook: webhookRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
