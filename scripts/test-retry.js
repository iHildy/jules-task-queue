/**
 * Jules Task Queue - Manual Retry Script
 *
 * This script allows for the manual retry of a single flagged task.
 *
 * Usage:
 * - node scripts/test-retry.js <taskId>
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Set up paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Add the root directory to the module path
process.chdir(rootDir);

// Import the retry function
const { processTaskRetry, getTaskById } = await import(
  "../src/lib/jules.js"
);

/**
 * Main execution function
 */
async function executeManualRetry() {
  const taskId = process.argv[2];

  if (!taskId) {
    console.error("❌ Error: Please provide a task ID.");
    console.error("Usage: node scripts/test-retry.js <taskId>");
    process.exit(1);
  }

  const startTime = Date.now();
  const executionId = `manual_retry_${taskId}_${Date.now()}`;

  try {
    console.log(
      `🔄 [${new Date().toISOString()}] Starting manual retry for task ${taskId} [${executionId}]`,
    );

    const task = await getTaskById(parseInt(taskId));
    if (!task) {
        console.error(`❌ Error: Task with ID ${taskId} not found.`);
        process.exit(1);
    }

    if (!task.flaggedForRetry) {
        console.warn(`⚠️ Warning: Task ${taskId} is not flagged for retry. Attempting retry anyway.`);
    }

    // Execute the retry process
    const success = await processTaskRetry(parseInt(taskId));

    const processingTime = Date.now() - startTime;

    if (success) {
      console.log(
        `✅ [${new Date().toISOString()}] Manual retry successful for task ${taskId} [${executionId}]:`,
        {
          processingTime: `${processingTime}ms`,
        },
      );
    } else {
        console.error(
            `❌ [${new Date().toISOString()}] Manual retry failed for task ${taskId} [${executionId}]:`,
            {
              processingTime: `${processingTime}ms`,
            },
          );
    }

    // Success exit
    process.exit(0);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error(
      `❌ [${new Date().toISOString()}] Manual retry failed for task ${taskId} [${executionId}]:`,
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

// Execute the manual retry
executeManualRetry();
