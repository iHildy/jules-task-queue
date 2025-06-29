import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const webhookRouter = createTRPCRouter({
  // Health check for webhooks
  health: publicProcedure.query(async ({ ctx }) => {
    try {
      // Check database connectivity
      await ctx.db.$queryRaw`SELECT 1`;

      return {
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
        version: "0.1.0",
        environment: ctx.env.NODE_ENV,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }),
});
