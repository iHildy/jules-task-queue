import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here.
   */
  server: {
    // Database
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

    // GitHub App Integration
    GITHUB_APP_PRIVATE_KEY: z
      .string()
      .min(1, "GITHUB_APP_PRIVATE_KEY is required"),
    GITHUB_APP_WEBHOOK_SECRET: z
      .string()
      .min(1, "GITHUB_APP_WEBHOOK_SECRET is required"),
    GITHUB_APP_CLIENT_ID: z.string().min(1, "GITHUB_APP_CLIENT_ID is required"),
    GITHUB_APP_CLIENT_SECRET: z
      .string()
      .min(1, "GITHUB_APP_CLIENT_SECRET is required"),

    // Application
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Cron Job Security
    CRON_SECRET: z.string().optional(),

    // Optional: Custom processing settings
    COMMENT_CHECK_DELAY_MS: z.coerce.number().default(60000),
    RETRY_INTERVAL_MINUTES: z.coerce.number().default(30),
    TASK_CLEANUP_DAYS: z.coerce.number().default(7),

    // Optional: Star requirement
    STAR_REQUIREMENT: z.string().optional(),
    REPO_OWNER: z.string().optional(),
    REPO_NAME: z.string().optional(),

    // --- Testing only ---
    TEST_FIXED_INSTALLATION_ID: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. To expose them to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_GITHUB_APP_NAME: z
      .string()
      .min(1, "NEXT_PUBLIC_GITHUB_APP_NAME is required"),
    NEXT_PUBLIC_GITHUB_APP_ID: z
      .string()
      .min(1, "NEXT_PUBLIC_GITHUB_APP_ID is required"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    // Server
    DATABASE_URL: process.env.DATABASE_URL,
    GITHUB_APP_PRIVATE_KEY:
      typeof window === "undefined"
        ? process.env.GITHUB_APP_PRIVATE_KEY
          ? Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
              "utf-8",
            )
          : undefined
        : process.env.GITHUB_APP_PRIVATE_KEY,
    GITHUB_APP_WEBHOOK_SECRET: process.env.GITHUB_APP_WEBHOOK_SECRET,
    GITHUB_APP_CLIENT_ID: process.env.GITHUB_APP_CLIENT_ID,
    GITHUB_APP_CLIENT_SECRET: process.env.GITHUB_APP_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    CRON_SECRET: process.env.CRON_SECRET,
    COMMENT_CHECK_DELAY_MS: process.env.COMMENT_CHECK_DELAY_MS,
    RETRY_INTERVAL_MINUTES: process.env.RETRY_INTERVAL_MINUTES,
    TASK_CLEANUP_DAYS: process.env.TASK_CLEANUP_DAYS,
    STAR_REQUIREMENT: process.env.STAR_REQUIREMENT,
    REPO_OWNER: process.env.REPO_OWNER,
    REPO_NAME: process.env.REPO_NAME,
    TEST_FIXED_INSTALLATION_ID: process.env.TEST_FIXED_INSTALLATION_ID,

    // Client
    NEXT_PUBLIC_GITHUB_APP_NAME: process.env.NEXT_PUBLIC_GITHUB_APP_NAME,
    NEXT_PUBLIC_GITHUB_APP_ID: process.env.NEXT_PUBLIC_GITHUB_APP_ID,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION || typeof window !== "undefined",
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

// Helper functions for checking optional configurations
export const hasWebhookSecret = () => !!env.GITHUB_APP_WEBHOOK_SECRET;
export const hasCronSecret = () => !!env.CRON_SECRET;

// GitHub App configured helper
export const hasGitHubApp = () =>
  !!env.NEXT_PUBLIC_GITHUB_APP_ID && !!env.GITHUB_APP_PRIVATE_KEY;

// Star requirement configured helper
export const isStarRequirementEnabled = () =>
  env.STAR_REQUIREMENT === "true" && !!env.REPO_OWNER && !!env.REPO_NAME;
