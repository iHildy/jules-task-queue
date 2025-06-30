import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";

// Define secrets
const cronSecret = defineSecret("CRON_SECRET");

/**
 * Get the base URL for the deployed App Hosting instance
 * This will be automatically set by Firebase App Hosting
 */
function getAppHostingUrl(): string {
  // Firebase App Hosting sets this environment variable
  const appHostingUrl = process.env.FIREBASE_APP_HOSTING_URL;
  if (appHostingUrl) {
    return appHostingUrl;
  }

  // Fallback to constructing from project info
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const region = process.env.FUNCTION_REGION || "us-central1";

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  if (projectId) {
    console.log(
      "Could not determine App Hosting URL. trying to construct from project info. Detected project info:",
    );
    console.log("Project ID:", projectId);
    console.log("Region:", region);
    console.log("Node env:", process.env.NODE_ENV);
    console.log(
      "Constructed URL:",
      `https://jules-task-queue--${projectId}.${region}.hosted.app`,
    );
    // Firebase App Hosting URL format - users will need to update BACKEND_ID
    return `https://jules-task-queue--${projectId}.${region}.hosted.app`;
  }

  throw new Error(
    "Cannot determine App Hosting URL. Please set FIREBASE_APP_HOSTING_URL environment variable in Firebase Functions config. If you are running locally, set NODE_ENV=development",
  );
}

/**
 * Call the centralized retry endpoint in the App Hosting instance
 */
async function callRetryEndpoint(appUrl: string, secret: string) {
  const retryUrl = `${appUrl}/api/cron/retry`;

  logger.info(`Calling retry endpoint: ${retryUrl}`);

  const response = await fetch(retryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "User-Agent": "Firebase-Cloud-Functions/1.0",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Retry endpoint failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  logger.info("Retry endpoint response:", result);

  return result;
}

/**
 * Scheduled function to retry flagged tasks
 * Runs every 30 minutes and calls the centralized retry logic in App Hosting
 */
export const retryTasks = onSchedule(
  {
    schedule: "*/30 * * * *", // Every 30 minutes
    timeZone: "UTC",
    secrets: [cronSecret],
    memory: "256MiB",
    timeoutSeconds: 540, // 9 minutes
    region: "us-central1",
  },
  async (event) => {
    const startTime = Date.now();
    const executionId = `firebase_cron_${Date.now()}`;

    try {
      logger.info(`🔄 Starting Firebase cron job [${executionId}]`);

      // Get the App Hosting URL
      const appUrl = getAppHostingUrl();
      logger.info(`Using App Hosting URL: ${appUrl}`);

      // Call the centralized retry endpoint
      const result = await callRetryEndpoint(appUrl, cronSecret.value());

      const processingTime = Date.now() - startTime;

      // Log results
      logger.info(`✅ Cron job completed [${executionId}]:`, {
        appUrl,
        result,
        processingTime: `${processingTime}ms`,
      });

      // Don't return anything in Firebase Functions v6
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error(`❌ Cron job failed [${executionId}]:`, {
        error: errorMessage,
        processingTime: `${processingTime}ms`,
        stack: error instanceof Error ? error.stack : undefined,
      });

      logger.error(
        `🚨 CRITICAL: Firebase cron job failure [${executionId}] - Manual intervention may be required`,
      );

      throw new Error(`Cron job failed: ${errorMessage}`);
    }
  },
);

/**
 * Health check function for the retry system
 * Calls the health endpoint on the App Hosting instance
 */
export const retryTasksHealth = onSchedule(
  {
    schedule: "0 */6 * * *", // Every 6 hours
    timeZone: "UTC",
    secrets: [cronSecret],
    memory: "256MiB",
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (event) => {
    try {
      const appUrl = getAppHostingUrl();
      const healthUrl = `${appUrl}/api/health`;

      logger.info(`📊 Checking health endpoint: ${healthUrl}`);

      const response = await fetch(healthUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Firebase-Cloud-Functions-Health/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Health check failed: ${response.status} ${response.statusText}`,
        );
      }

      const healthData = await response.json();

      logger.info("📊 Retry system health check:", {
        appUrl,
        health: healthData,
        timestamp: new Date().toISOString(),
      });

      // Don't return anything in Firebase Functions v6
    } catch (error) {
      logger.error("❌ Health check failed:", error);
      throw error;
    }
  },
);

/**
 * Manual trigger function for testing
 * Can be called manually to test the retry system
 */
export const triggerRetryManual = onSchedule(
  {
    schedule: "0 0 1 1 *", // Never runs automatically (Jan 1st only)
    timeZone: "UTC",
    secrets: [cronSecret],
    memory: "256MiB",
    timeoutSeconds: 540,
    region: "us-central1",
  },
  async (event) => {
    logger.info("🔧 Manual retry trigger activated");

    try {
      const appUrl = getAppHostingUrl();
      const result = await callRetryEndpoint(appUrl, cronSecret.value());

      logger.info("🔧 Manual retry completed:", result);
      // Don't return anything in Firebase Functions v6
    } catch (error) {
      logger.error("🔧 Manual retry failed:", error);
      throw error;
    }
  },
);
