/**
 * Trigger Comment Check Script
 *
 * This script manually triggers comment checks for existing issues
 * to test the fixed pattern matching.
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
async function triggerCommentCheck() {
  try {
    console.log("🔄 Triggering comment check for existing issues...");

    // Import Prisma client directly
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();

    try {
      // Get all tasks that haven't been flagged for retry
      const tasks = await db.julesTask.findMany({
        where: {
          flaggedForRetry: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      console.log(`📊 Found ${tasks.length} tasks to check`);

      // For now, let's just check issue #25 which we know has a task limit comment
      const targetIssue = 25;
      const targetTask = tasks.find(
        (task) => task.githubIssueNumber === BigInt(targetIssue),
      );

      if (targetTask) {
        console.log(`🎯 Found task ${targetTask.id} for issue #${targetIssue}`);
        console.log(
          `   Current state: flaggedForRetry=${targetTask.flaggedForRetry}, retryCount=${targetTask.retryCount}`,
        );

        // Manually trigger the comment check by simulating the webhook logic
        console.log("🔄 Simulating comment check...");

        // Import the comment check function
        const { checkJulesComments, processWorkflowDecision } = await import(
          "../src/lib/jules.js"
        );

        try {
          const commentResult = await checkJulesComments(
            targetTask.repoOwner,
            targetTask.repoName,
            Number(targetTask.githubIssueNumber),
            3, // maxRetries
            0.6, // minConfidence
          );

          console.log("📝 Comment analysis result:", {
            action: commentResult.action,
            confidence: commentResult.analysis?.confidence,
            patterns: commentResult.analysis?.patterns_matched,
          });

          // Process the workflow decision
          await processWorkflowDecision(
            targetTask.repoOwner,
            targetTask.repoName,
            Number(targetTask.githubIssueNumber),
            targetTask.id,
            commentResult,
          );

          console.log("✅ Comment check completed");
        } catch (error) {
          console.error("❌ Error during comment check:", error);
        }
      } else {
        console.log(`❌ Task for issue #${targetIssue} not found`);
      }
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    console.error("❌ Error triggering comment check:", error);
    process.exit(1);
  }
}

// Execute the trigger
triggerCommentCheck();
