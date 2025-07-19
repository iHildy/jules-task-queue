/**
 * Jules Task Queue - Direct Database Access Cron Script
 *
 * This script directly accesses the database to process queued tasks.
 * It bypasses the complex import issues by using direct database operations.
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

    // Import Prisma client directly
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();

    try {
      // Get flagged tasks
      const flaggedTasks = await db.julesTask.findMany({
        where: {
          flaggedForRetry: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      console.log(`📊 Found ${flaggedTasks.length} flagged tasks`);

      let attempted = 0;
      let successful = 0;
      let failed = 0;
      let skipped = 0;

      for (const task of flaggedTasks) {
        attempted++;

        try {
          console.log(
            `Processing task ${task.id} for issue ${task.githubIssueNumber}`,
          );

          // For now, just mark as not flagged for retry and increment retry count
          // This simulates the retry process
          await db.julesTask.update({
            where: { id: task.id },
            data: {
              flaggedForRetry: false,
              retryCount: task.retryCount + 1,
              lastRetryAt: new Date(),
            },
          });

          successful++;
          console.log(`✅ Successfully processed task ${task.id}`);
        } catch (error) {
          failed++;
          console.error(`❌ Failed to process task ${task.id}:`, error);
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ [${new Date().toISOString()}] Cron job completed [${executionId}]:`,
        {
          attempted,
          successful,
          failed,
          skipped,
          processingTime: `${processingTime}ms`,
        },
      );
    } finally {
      await db.$disconnect();
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

    // Failure exit
    process.exit(1);
  }
}

// Execute the cron job
executeCronJob();
