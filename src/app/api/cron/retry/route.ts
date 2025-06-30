/**
 * Jules Task Queue - Cron Job for Retrying Flagged Tasks
 *
 * DEPLOYMENT NOTES:
 * - Vercel: This endpoint is called every 30 minutes by Vercel's cron job feature (configured in vercel.json)
 * - Self-Hosting: This endpoint is NOT automatically called. You need to set up your own cron job:
 *
 *   Option 1 (Docker): Use the provided docker-compose.yml which handles cron automatically
 *   Option 2 (Manual): Add to your crontab: every 30 minutes run: cd /path/to/app && pnpm cron:run
 *   Option 3 (Coolify): Add scheduled task with command: pnpm cron:run (every 30 minutes)
 *   Option 4 (Manual API call): Call this endpoint directly: POST /api/cron/retry with CRON_SECRET header
 *
 * This endpoint finds all tasks flagged for retry and attempts to process them again.
 */

import { env } from "@/lib/env";
import { cleanupOldTasks, retryAllFlaggedTasks } from "@/lib/jules";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verify cron job authorization with cron secret verification
 */
function verifyCronAuth(req: NextRequest): boolean {
  // Check for Vercel cron secret if available
  const cronSecret = req.headers.get("authorization");
  if (env.CRON_SECRET) {
    return cronSecret === `Bearer ${env.CRON_SECRET}`;
  }

  // In development, allow without auth
  if (env.NODE_ENV === "development") {
    console.warn(
      "Cron endpoint accessed without authentication in development mode",
    );
    return true;
  }

  // In production without CRON_SECRET, deny access
  console.error("Cron endpoint accessed without proper authentication");
  return false;
}

/**
 * Log cron job execution
 */
async function logCronExecution(
  jobType: string,
  success: boolean,
  stats?: Record<string, unknown>,
  error?: string,
): Promise<void> {
  try {
    await db.webhookLog.create({
      data: {
        eventType: `cron_${jobType}`,
        payload: JSON.stringify({
          jobType,
          stats: stats || {},
          timestamp: new Date().toISOString(),
        }),
        success,
        error: error || null,
      },
    });
  } catch (logError) {
    console.error("Failed to log cron execution:", logError);
  }
}

/**
 * Main cron job handler - processes queued Jules tasks
 * This should be called every 30 minutes via Vercel Cron Jobs
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Verify authorization
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Starting cron job: retry flagged Jules tasks");

  try {
    // Retry all flagged tasks
    const retryStats = await retryAllFlaggedTasks();

    // Also perform housekeeping - cleanup old completed tasks
    const cleanupCount = await cleanupOldTasks(7); // Keep tasks for 7 days

    const executionTime = Date.now() - startTime;
    const stats = {
      ...retryStats,
      cleanupCount,
      executionTimeMs: executionTime,
    };

    console.log("Cron job completed successfully:", stats);

    // Log successful execution
    await logCronExecution("retry_tasks", true, stats);

    return NextResponse.json({
      success: true,
      message: "Cron job completed successfully",
      stats,
      executionTimeMs: executionTime,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const executionTime = Date.now() - startTime;

    console.error("Cron job failed:", {
      error: errorMessage,
      executionTimeMs: executionTime,
    });

    // Log failed execution
    await logCronExecution(
      "retry_tasks",
      false,
      { executionTimeMs: executionTime },
      errorMessage,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Cron job failed",
        message: errorMessage,
        executionTimeMs: executionTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Health check for cron job endpoint
 */
export async function GET() {
  try {
    // Check database connectivity
    await db.$queryRaw`SELECT 1`;

    // Get current queue status
    const queueStats = await db.julesTask.count({
      where: { flaggedForRetry: true },
    });

    // Get recent cron executions
    const recentCronLogs = await db.webhookLog.findMany({
      where: {
        eventType: "cron_retry_tasks",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const lastSuccessfulRun = recentCronLogs.find((log) => log.success);
    const lastFailedRun = recentCronLogs.find((log) => !log.success);

    return NextResponse.json({
      status: "healthy",
      service: "Jules task retry cron job",
      database: "connected",
      currentQueueSize: queueStats,
      cronSecretConfigured: !!env.CRON_SECRET,
      lastSuccessfulRun: lastSuccessfulRun?.createdAt || null,
      lastFailedRun: lastFailedRun?.createdAt || null,
      recentExecutions: recentCronLogs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        service: "Jules task retry cron job",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Manual trigger endpoint (for testing and emergency use)
 * Only available in development or with proper authentication
 */
export async function PUT(req: NextRequest) {
  // Require authentication for manual triggers
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Manual cron job trigger requested");

  try {
    const body = await req.json().catch(() => ({}));
    const { taskId } = body;

    if (taskId) {
      // Retry specific task
      const { processTaskRetry } = await import("@/lib/jules");
      const success = await processTaskRetry(taskId);

      return NextResponse.json({
        success,
        message: success
          ? `Task ${taskId} retried successfully`
          : `Task ${taskId} retry skipped or failed`,
        taskId,
      });
    } else {
      // Retry all flagged tasks
      const stats = await retryAllFlaggedTasks();

      return NextResponse.json({
        success: true,
        message: "Manual retry completed",
        stats,
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Manual retry failed",
        message: errorMessage,
      },
      { status: 500 },
    );
  }
}
