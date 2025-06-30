import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // GitHub Integration - Personal Token (Legacy/Self-hosted)
  GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required").optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // GitHub App Integration (Hosted service)
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_CLIENT_ID: z.string().optional(),
  GITHUB_APP_CLIENT_SECRET: z.string().optional(),

  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

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
    const parsed = envSchema.parse(process.env);
    
    // Validate that at least one authentication method is configured
    const hasPersonalToken = !!parsed.GITHUB_TOKEN;
    const hasGitHubApp = !!(parsed.GITHUB_APP_ID && parsed.GITHUB_APP_PRIVATE_KEY);
    
    if (!hasPersonalToken && !hasGitHubApp) {
      throw new Error(
        "❌ GitHub authentication not configured!\n\n" +
        "You must configure either:\n" +
        "  - Personal Token: Set GITHUB_TOKEN\n" +
        "  - GitHub App: Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY\n\n" +
        "📝 See documentation for setup instructions."
      );
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(
          (err) => err.code === "invalid_type" && err.received === "undefined",
        )
        .map((err) => err.path.join("."));

      const invalidVars = error.errors
        .filter(
          (err) => err.code !== "invalid_type" || err.received !== "undefined",
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

// Helper functions for checking configurations
export const hasPersonalToken = () => !!env.GITHUB_TOKEN;
export const hasGitHubApp = () => !!(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY);
export const hasWebhookSecret = () => !!(env.GITHUB_WEBHOOK_SECRET || env.GITHUB_APP_WEBHOOK_SECRET);
export const hasCronSecret = () => !!env.CRON_SECRET;

// Authentication method detection
export const getAuthMethod = (): 'personal-token' | 'github-app' | 'none' => {
  if (hasGitHubApp()) return 'github-app';
  if (hasPersonalToken()) return 'personal-token';
  return 'none';
};

// Processing configuration with defaults
export const processingConfig = {
  commentCheckDelay: env.COMMENT_CHECK_DELAY_MS || 60000, // 60 seconds
  retryInterval: env.RETRY_INTERVAL_MINUTES || 30, // 30 minutes
  taskCleanupDays: env.TASK_CLEANUP_DAYS || 7, // 7 days
};
