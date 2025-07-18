/**
 * Jules Task Queue - Self-Hosting Cron Script
 *
 * This script replaces Vercel's cron jobs when self-hosting.
 * It should be run every 30 minutes via cron or a task scheduler.
 *
 * Usage:
 * - Docker: Automatically handled by docker-compose.yml
 * - Manual: Add to crontab: TIME_HERE cd /path/to/app && node scripts/retry-tasks.js
 * - Coolify: Add as scheduled task with command: pnpm cron:run
 */
// TIME_HERE is the time to run the cron job, e.g. */30 * * * * for every 30 minutes

import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Set up paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Add the root directory to the module path
process.chdir(rootDir);

// Import the retry function
const { retryAllFlaggedTasks, getTaskStats } = await import(
  "../src/lib/jules.js"
);

/**
 * Main execution function
 */
async function executeCronJob() {
  const startTime = Date.now();
  const executionId = `self_hosted_cron_${Date.now()}`;

  try {
    // Heartbeat log message
    console.log(
      `[${new Date().toISOString()}] Cron job heartbeat [${executionId}]`,
    );

    // Get pre-execution stats
    const preStats = await getTaskStats();
    console.log(
      `[${new Date().toISOString()}] Pre-execution stats: ${preStats.queuedTasks} queued tasks, ${preStats.totalTasks} total tasks.`,
    );

    if (preStats.queuedTasks === 0) {
      console.log(
        `[${new Date().toISOString()}] No tasks to process. Exiting.`,
      );
      process.exit(0);
      return;
    }

    // Execute the retry process
    const result = await retryAllFlaggedTasks();

    // Get post-execution stats
    const postStats = await getTaskStats();
    const processingTime = Date.now() - startTime;

    // Log results
    console.log(
      `[${new Date().toISOString()}] Cron job finished. Processed ${result.attempted} tasks in ${processingTime}ms.`,
    );
    console.log(
      `[${new Date().toISOString()}] Success: ${result.successful}, Failures: ${result.failed}.`,
    );

    // Alert if there are concerning patterns
    if (result.failed > 0) {
      console.warn(
        `[${new Date().toISOString()}] ${result.failed} tasks failed. Please check the logs for details.`,
      );
    }

    if (postStats.queuedTasks > 50) {
      console.warn(
        `[${new Date().toISOString()}] High queue depth: ${postStats.queuedTasks} tasks still queued.`,
      );
    }

    // Success exit
    process.exit(0);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error(
      `[${new Date().toISOString()}] Cron job failed after ${processingTime}ms.`,
      {
        error: errorMessage,
        executionId: executionId,
      },
    );

    // Critical alert for cron failures
    console.error(
      `[${new Date().toISOString()}] CRITICAL: Self-hosted cron job failure. Manual intervention may be required.`,
    );

    // Failure exit
    process.exit(1);
  }
}

// Execute the cron job
executeCronJob();
