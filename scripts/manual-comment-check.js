/**
 * Manual Comment Check Script
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
async function manualCommentCheck() {
  try {
    console.log("🔍 Manual comment check for issue #88...");

    // Import the necessary functions
    const { checkJulesComments, processWorkflowDecision } = await import(
      "../src/lib/jules.js"
    );
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();

    try {
      // Find the task for issue #88
      const task = await db.julesTask.findFirst({
        where: {
          githubIssueNumber: BigInt(88),
        },
      });

      if (!task) {
        console.log("❌ No task found for issue #88");
        return;
      }

      console.log(`📋 Found task ${task.id} for issue #88`);

      // Check Jules comments
      const commentResult = await checkJulesComments(
        "iHildy",
        "jules-task-queue",
        88,
        3, // maxRetries
        0.6, // minConfidence
        task.installationId || undefined,
      );

      console.log("🔍 Comment analysis result:", {
        action: commentResult.action,
        confidence: commentResult.analysis?.confidence,
        retryCount: commentResult.retryCount,
        patterns: commentResult.analysis?.patterns_matched,
      });

      // Process the workflow decision
      await processWorkflowDecision(
        "iHildy",
        "jules-task-queue",
        88,
        task.id,
        commentResult,
        task.installationId || undefined,
      );

      console.log("✅ Workflow decision processed");

      // Check the task status after processing
      const updatedTask = await db.julesTask.findUnique({
        where: { id: task.id },
      });

      console.log("📊 Updated task status:", {
        flaggedForRetry: updatedTask?.flaggedForRetry,
        retryCount: updatedTask?.retryCount,
        lastRetryAt: updatedTask?.lastRetryAt,
      });
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    console.error("❌ Error during manual comment check:", error);
    process.exit(1);
  }
}

// Execute the check
manualCommentCheck();
