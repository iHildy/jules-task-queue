/**
 * Jules Task Queue - Simplified Self-Hosting Cron Script
 *
 * This script replaces Vercel's cron jobs when self-hosting.
 * It should be run every 30 minutes via cron or a task scheduler.
 */

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

    // For now, just log that we're running
    console.log(
      "✅ Cron job script is working - queueing system would process tasks here",
    );

    // TODO: Import and run the actual retry logic once import issues are resolved
    // const { retryAllFlaggedTasks, getTaskStats } = await import("../src/lib/jules.js");
    // const result = await retryAllFlaggedTasks();

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ [${new Date().toISOString()}] Cron job completed [${executionId}]:`,
      {
        processingTime: `${processingTime}ms`,
        status: "Script working - import issues need resolution",
      },
    );

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

    // Failure exit
    process.exit(1);
  }
}

// Execute the cron job
executeCronJob();
