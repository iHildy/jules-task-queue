import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // GitHub App Integration
  GITHUB_APP_ID: z
    .string()
    .min(1, "GITHUB_APP_ID is required"),
  GITHUB_APP_PRIVATE_KEY: z
    .string()
    .min(1, "GITHUB_APP_PRIVATE_KEY is required"),
  GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_NAME: z.string().optional(),

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
 * Returns true when environment validation should be skipped.
 *
 * We intentionally skip validation during **build time** (e.g. `next build`)
 * because most self-hosting platforms – Coolify, Railway Nixpacks, Vercel –
 * execute the build inside a clean container **without** runtime secrets.
 *
 * Runtime validation (when the container actually starts) is still executed
 * so we can safely crash fast if required variables are missing in
 * production.
 */
function shouldSkipValidation(): boolean {
  // Explicit opt-out (useful for CI / storybook etc.)
  if (process.env.SKIP_ENV_VALIDATION === "true") return true;

  // Next.js sets this during the compilation step.
  if (process.env.NEXT_PHASE === "phase-production-build") return true;

  return false;
}

/**
 * Validates environment variables at startup
 * Throws an error if any required variables are missing or invalid
 */
function validateEnv(): Env {
  if (shouldSkipValidation()) {
    console.warn(
      "⚠️ Skipping environment variable validation during build/CI phase.",
    );
    return {} as Env;
  }

  try {
    return envSchema.parse(process.env);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const missingVars = (err.errors as z.ZodIssue[])
        .filter(
          (err) => err.code === "invalid_type" && err.received === "undefined",
        )
        .map((err) => err.path.join("."));

      const invalidVars = (err.errors as z.ZodIssue[])
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
    throw err;
  }
}

// Validate environment variables on module load
export const env = validateEnv();

// Helper functions for checking optional configurations
export const hasWebhookSecret = () => !!env.GITHUB_APP_WEBHOOK_SECRET;
export const hasCronSecret = () => !!env.CRON_SECRET;

// GitHub App configured helper
export const hasGitHubApp = () =>
  !!env.GITHUB_APP_ID && !!env.GITHUB_APP_PRIVATE_KEY;

// Processing configuration with defaults
export const processingConfig = {
  commentCheckDelay: env.COMMENT_CHECK_DELAY_MS || 60000, // 60 seconds
  retryInterval: env.RETRY_INTERVAL_MINUTES || 30, // 30 minutes
  taskCleanupDays: env.TASK_CLEANUP_DAYS || 7, // 7 days
};