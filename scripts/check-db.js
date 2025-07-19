/**
 * Check Database State Script
 *
 * This script checks the current state of the database to understand
 * what's happening with the Jules tasks.
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
async function checkDatabase() {
  try {
    console.log("🔍 Checking database state...");

    // Import Prisma client directly
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();

    try {
      // Check all Jules tasks
      const allTasks = await db.julesTask.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      console.log(`📊 Found ${allTasks.length} total Jules tasks`);

      // Check flagged tasks
      const flaggedTasks = await db.julesTask.findMany({
        where: {
          flaggedForRetry: true,
        },
      });

      console.log(`🚩 Found ${flaggedTasks.length} flagged tasks`);

      // Check recent webhook logs
      const recentLogs = await db.webhookLog.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      console.log(`📝 Found ${recentLogs.length} recent webhook logs`);

      // Display task details
      if (allTasks.length > 0) {
        console.log("\n📋 Recent Jules Tasks:");
        allTasks.slice(0, 5).forEach((task) => {
          console.log(
            `  - Task ${task.id}: Issue #${task.githubIssueNumber} (${task.repoOwner}/${task.repoName})`,
          );
          console.log(
            `    Flagged: ${task.flaggedForRetry}, Retries: ${task.retryCount}, Created: ${task.createdAt}`,
          );
        });
      }

      // Display webhook log details
      if (recentLogs.length > 0) {
        console.log("\n📝 Recent Webhook Logs:");
        recentLogs.forEach((log) => {
          console.log(
            `  - ${log.eventType}: ${log.success ? "✅" : "❌"} ${log.createdAt}`,
          );
          if (log.error) {
            console.log(`    Error: ${log.error}`);
          }
        });
      }

      // Check if any tasks should be flagged
      console.log("\n🔍 Analysis:");
      if (flaggedTasks.length === 0 && allTasks.length > 0) {
        console.log("❌ No tasks are flagged for retry, but tasks exist.");
        console.log(
          "   This suggests the webhook system isn't processing task limit comments.",
        );
      } else if (flaggedTasks.length > 0) {
        console.log("✅ Tasks are properly flagged for retry.");
      } else {
        console.log("ℹ️  No tasks found in database.");
      }
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    console.error("❌ Error checking database:", error);
    process.exit(1);
  }
}

// Execute the check
checkDatabase();
