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
      .min(1, "GITHUB_APP_PRIVATE_KEY is required")
      .transform((val) => {
        if (
          val.startsWith("-----BEGIN RSA PRIVATE KEY-----") ||
          val.includes("\\n")
        ) {
          return val.replace(/\\n/g, "\n");
        }
        // It's not a raw PEM, assume it's base64 encoded
        try {
          const decoded = Buffer.from(val, "base64").toString("utf-8");
          if (!decoded.startsWith("-----BEGIN RSA PRIVATE KEY-----")) {
            throw new Error("Invalid Base64-decoded private key format");
          }
          return decoded;
        } catch {
          throw new Error(
            "Failed to decode GITHUB_APP_PRIVATE_KEY. Ensure it is a valid PEM or Base64-encoded string.",
          );
        }
      }),
    GITHUB_APP_WEBHOOK_SECRET: z
      .string()
      .min(1, "GITHUB_APP_WEBHOOK_SECRET is required"),
    GITHUB_APP_CLIENT_ID: z.string().min(1, "GITHUB_APP_CLIENT_ID is required"),
    GITHUB_APP_CLIENT_SECRET: z
      .string()
      .min(1, "GITHUB_APP_CLIENT_SECRET is required"),
    GITHUB_APP_CALLBACK_URL: z
      .string()
      .url("GITHUB_APP_CALLBACK_URL must be a valid URL"),

    // Application
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Admin Security
    ADMIN_SECRET: z.string().optional(),

    // Cron Job Security
    CRON_SECRET: z.string().optional(),

    // Token Encryption (AES-256-CBC requires 32-byte key, 64 hex characters)
    TOKEN_ENCRYPTION_KEY: z
      .string()
      .min(
        64,
        "TOKEN_ENCRYPTION_KEY must be at least 64 hex characters (32 bytes) for AES-256-CBC",
      )
      .regex(
        /^[0-9a-fA-F]+$/,
        "TOKEN_ENCRYPTION_KEY must be a valid hexadecimal string",
      ),

    // Optional: Custom processing settings
    COMMENT_CHECK_DELAY_MS: z.coerce.number().default(60000),
    RETRY_INTERVAL_MINUTES: z.coerce.number().default(30),
    TASK_CLEANUP_DAYS: z.coerce.number().default(7),

    // Optional: Star requirement
    STAR_REQUIREMENT: z.string().optional(),
    REPO_OWNER: z.string().optional(),
    REPO_NAME: z.string().optional(),
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
    ADMIN_SECRET: process.env.ADMIN_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
    GITHUB_APP_WEBHOOK_SECRET: process.env.GITHUB_APP_WEBHOOK_SECRET,
    GITHUB_APP_CLIENT_ID: process.env.GITHUB_APP_CLIENT_ID,
    GITHUB_APP_CLIENT_SECRET: process.env.GITHUB_APP_CLIENT_SECRET,
    GITHUB_APP_CALLBACK_URL: process.env.GITHUB_APP_CALLBACK_URL,
    NODE_ENV: process.env.NODE_ENV,
    CRON_SECRET: process.env.CRON_SECRET,
    COMMENT_CHECK_DELAY_MS: process.env.COMMENT_CHECK_DELAY_MS,
    RETRY_INTERVAL_MINUTES: process.env.RETRY_INTERVAL_MINUTES,
    TASK_CLEANUP_DAYS: process.env.TASK_CLEANUP_DAYS,
    STAR_REQUIREMENT: process.env.STAR_REQUIREMENT,
    REPO_OWNER: process.env.REPO_OWNER,
    REPO_NAME: process.env.REPO_NAME,
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,

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
