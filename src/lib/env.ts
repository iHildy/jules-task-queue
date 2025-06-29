import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // GitHub Integration
  GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url().optional(),

  // Cron Job Security
  CRON_SECRET: z.string().optional(),

  // Optional: Custom processing settings
  COMMENT_CHECK_DELAY_MS: z
    .string()
    .transform((val) => parseInt(val) || 60000)
    .optional(),
  RETRY_INTERVAL_MINUTES: z
    .string()
    .transform((val) => parseInt(val) || 30)
    .optional(),
  TASK_CLEANUP_DAYS: z
    .string()
    .transform((val) => parseInt(val) || 7)
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at startup
 * Throws an error if any required variables are missing or invalid
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(
          (err) => err.code === "invalid_type" && err.received === "undefined"
        )
        .map((err) => err.path.join("."));

      const invalidVars = error.errors
        .filter(
          (err) => err.code !== "invalid_type" || err.received !== "undefined"
        )
        .map((err) => `${err.path.join(".")}: ${err.message}`);

      let errorMessage = "❌ Environment validation failed!\n\n";

      if (missingVars.length > 0) {
        errorMessage += `🔍 Missing required environment variables:\n`;
        errorMessage += missingVars.map((v) => `  - ${v}`).join("\n");
        errorMessage += "\n\n";
      }

      if (invalidVars.length > 0) {
        errorMessage += `⚠️  Invalid environment variables:\n`;
        errorMessage += invalidVars.map((v) => `  - ${v}`).join("\n");
        errorMessage += "\n\n";
      }

      errorMessage += `📝 Copy .env.example to .env.local and configure the required variables.\n`;
      errorMessage += `🔧 See README.md for setup instructions.\n`;

      throw new Error(errorMessage);
    }
    throw error;
  }
}

// Validate environment variables on module load
export const env = validateEnv();

// Helper functions for checking optional configurations
export const hasRedisConfig = () => {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  return !!(redisUrl && redisToken && redisUrl !== "" && redisToken !== "");
};
export const hasWebhookSecret = () => !!env.GITHUB_WEBHOOK_SECRET;
export const hasCronSecret = () => !!env.CRON_SECRET;

// Processing configuration with defaults
export const processingConfig = {
  commentCheckDelay: env.COMMENT_CHECK_DELAY_MS || 60000, // 60 seconds
  retryInterval: env.RETRY_INTERVAL_MINUTES || 30, // 30 minutes
  taskCleanupDays: env.TASK_CLEANUP_DAYS || 7, // 7 days
};
