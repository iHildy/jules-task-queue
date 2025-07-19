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

// Set environment variable to skip validation for cron script
process.env.SKIP_ENV_VALIDATION = "true";

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
    console.log(
      `🔄 [${new Date().toISOString()}] Starting self-hosted cron job [${executionId}]`,
    );

    // Get pre-execution stats
    const preStats = await getTaskStats();
    console.log(
      `📊 Pre-execution stats: ${preStats.queuedTasks} queued tasks, ${preStats.totalTasks} total`,
    );

    // Execute the retry process
    const result = await retryAllFlaggedTasks();

    // Get post-execution stats
    const postStats = await getTaskStats();

    const processingTime = Date.now() - startTime;
    const queueReduction = preStats.queuedTasks - postStats.queuedTasks;

    // Log results
    console.log(
      `✅ [${new Date().toISOString()}] Cron job completed [${executionId}]:`,
      {
        attempted: result.attempted,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        processingTime: `${processingTime}ms`,
        queueReduction: queueReduction,
      },
    );

    // Alert if there are concerning patterns
    if (result.failed > result.successful && result.attempted > 0) {
      console.warn(
        `⚠️ ALERT: More failures (${result.failed}) than successes (${result.successful})`,
      );
    }

    if (postStats.queuedTasks > 50) {
      console.warn(
        `⚠️ HIGH QUEUE DEPTH: ${postStats.queuedTasks} tasks still queued`,
      );
    }

    // Success exit
    process.exit(0);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error(
      `❌ [${new Date().toISOString()}] Cron job failed [${executionId}]:`,
      {
        error: errorMessage,
        processingTime: `${processingTime}ms`,
        stack: error instanceof Error ? error.stack : undefined,
      },
    );

    // Critical alert for cron failures
    console.error(
      `🚨 CRITICAL: Self-hosted cron job failure [${executionId}] - Manual intervention may be required`,
    );

    // Failure exit
    process.exit(1);
  }
}

// Execute the cron job
executeCronJob();
