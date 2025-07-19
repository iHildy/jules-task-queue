/**
 * Manual Flag Script
 *
 * This script manually flags a task for retry to test the cron job processing.
 */

import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Set up paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Add the root directory to the module path
process.chdir(rootDir);

// Set environment variable to skip validation for script
process.env.SKIP_ENV_VALIDATION = "true";

/**
 * Main execution function
 */
async function manualFlag() {
  try {
    console.log("🚩 Manually flagging task for retry...");

    // Import Prisma client directly
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();

    try {
      // Find the task for issue #25
      const targetIssue = 25;
      const targetTask = await db.julesTask.findFirst({
        where: {
          githubIssueNumber: BigInt(targetIssue),
        },
      });

      if (targetTask) {
        console.log(`🎯 Found task ${targetTask.id} for issue #${targetIssue}`);
        console.log(
          `   Current state: flaggedForRetry=${targetTask.flaggedForRetry}, retryCount=${targetTask.retryCount}`,
        );

        // Manually flag for retry
        const updatedTask = await db.julesTask.update({
          where: { id: targetTask.id },
          data: {
            flaggedForRetry: true,
          },
        });

        console.log(`✅ Task ${targetTask.id} flagged for retry`);
        console.log(
          `   New state: flaggedForRetry=${updatedTask.flaggedForRetry}, retryCount=${updatedTask.retryCount}`,
        );
      } else {
        console.log(`❌ Task for issue #${targetIssue} not found`);
      }
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    console.error("❌ Error manually flagging task:", error);
    process.exit(1);
  }
}

// Execute the manual flag
manualFlag();
