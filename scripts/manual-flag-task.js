/**
 * Manual Task Flag Script
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
async function manualFlagTask() {
  try {
    console.log("🔍 Manually flagging task for issue #120...");

    // Import Prisma client directly
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();

    try {
      // Find the task for issue #120
      const task = await db.julesTask.findFirst({
        where: { githubIssueNumber: BigInt(120) },
      });

      if (!task) {
        console.log("❌ No task found for issue #120");
        return;
      }

      console.log(`Found task ${task.id} for issue #120`);

      // Flag the task for retry
      await db.julesTask.update({
        where: { id: task.id },
        data: {
          flaggedForRetry: true,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Successfully flagged task ${task.id} for retry`);
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    console.error("❌ Error flagging task:", error);
  }
}

// Execute the flag
manualFlagTask();
