import { env } from "@/lib/env";
import { createJulesLabelsForRepository } from "@/lib/github-labels";
import logger from "@/lib/logger";
import { processJulesLabelEvent } from "@/lib/webhook-processor";
import { db } from "@/server/db";
import { GitHubLabelEventSchema } from "@/types";
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GitHub webhook payload interfaces
interface GitHubAccount {
  id: number;
  login: string;
  type: string;
}

interface GitHubInstallation {
  id: number;
  account: GitHubAccount;
  target_type: string;
  permissions: Record<string, string>;
  events: string[];
  single_file_name?: string;
  repository_selection: string;
  suspended_at?: string;
  suspended_by?: { login: string };
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner?: GitHubAccount; // Optional for installation webhooks
  private: boolean;
  html_url?: string; // Optional for installation webhooks
  description?: string;
}

interface GitHubInstallationEvent {
  action: string;
  installation: GitHubInstallation;
  repositories?: GitHubRepository[];
}

interface GitHubInstallationRepositoriesEvent {
  action: string;
  installation: GitHubInstallation;
  repositories_added?: GitHubRepository[];
  repositories_removed?: GitHubRepository[];
}

interface GitHubLabel {
  name: string;
}

interface GitHubUser {
  login: string;
}

interface GitHubIssue {
  number: number;
  state: string;
  labels: GitHubLabel[];
}

interface GitHubComment {
  user: GitHubUser;
}

interface GitHubIssueCommentEvent {
  action: string;
  issue: GitHubIssue;
  comment: GitHubComment;
  repository: GitHubRepository;
  installation?: { id: number };
}

interface GitHubWebhookEvent {
  action: string;
  installation?: { id: number };
  [key: string]: unknown;
}

/**
 * Verify GitHub App webhook signature
 */
function verifyGitHubAppSignature(payload: string, signature: string): boolean {
  if (!env.GITHUB_APP_WEBHOOK_SECRET) {
    if (env.NODE_ENV === "development") {
      logger.warn(
        "GITHUB_APP_WEBHOOK_SECRET not configured - allowing unsigned webhooks in development only",
      );
      return true;
    }
    logger.error(
      "GITHUB_APP_WEBHOOK_SECRET not configured in production - denying webhook",
    );
    return false;
  }

  if (!signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = signature.slice(7); // Remove 'sha256=' prefix
  const computedSignature = createHmac("sha256", env.GITHUB_APP_WEBHOOK_SECRET)
    .update(payload, "utf8")
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(computedSignature, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Minimal rate limiting for webhook endpoint to prevent DB flooding
 */
async function checkRateLimit(
  identifierRaw: string,
  maxRequests: number = 30,
  windowMs: number = 60 * 1000,
) {
  // Normalize/shorten identifier to avoid oversized keys
  const identifier = identifierRaw.slice(0, 64);
  const now = new Date();
  const endpoint = "/api/webhooks/github-app";

  try {
    // Throttle cleanup (only 1% of requests trigger it) to reduce contention
    if (Math.random() < 0.01) {
      void db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
    }

    // Atomic upsert with conditional increment to avoid race conditions
    // 1. Try to increment if window active and under limit
    const updated = await db.$executeRawUnsafe<number>(
      `UPDATE rate_limits
       SET requests = requests + 1
       WHERE identifier = $1 AND endpoint = $2 AND "expiresAt" > $3 AND requests < $4`,
      identifier,
      endpoint,
      now,
      maxRequests,
    );

    if (updated && updated > 0) {
      // Fetch remaining in a lightweight way
      const row = await db.rateLimit.findUnique({
        where: { identifier_endpoint: { identifier, endpoint } },
        select: { requests: true },
      });
      const remaining = Math.max(
        0,
        maxRequests - (row?.requests ?? maxRequests),
      );
      return { allowed: true, remaining } as const;
    }

    // 2. Either new window or first request: try insert
    try {
      // Use upsert to avoid unique constraint races
      const record = await db.rateLimit.upsert({
        where: { identifier_endpoint: { identifier, endpoint } },
        update: {},
        create: {
          identifier,
          endpoint,
          requests: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + windowMs),
        },
      });
      // If upsert hit existing row (update no-op), decide based on expiry/requests
      if (record.expiresAt <= now) {
        const reset = await db.rateLimit.update({
          where: { id: record.id },
          data: {
            requests: 1,
            windowStart: now,
            expiresAt: new Date(now.getTime() + windowMs),
          },
        });
        return {
          allowed: true,
          remaining: maxRequests - reset.requests,
        } as const;
      }
      if (record.requests >= maxRequests) {
        return { allowed: false, remaining: 0 } as const;
      }
      const updatedRecord = await db.rateLimit.update({
        where: { id: record.id },
        data: { requests: { increment: 1 } },
        select: { requests: true },
      });
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - updatedRecord.requests),
      } as const;
    } catch {
      // 3. If upsert failed (rare), reset window if expired, else check limit
      const record = await db.rateLimit.findUnique({
        where: { identifier_endpoint: { identifier, endpoint } },
      });
      if (!record) {
        return { allowed: true, remaining: maxRequests - 1 } as const;
      }
      if (record.expiresAt <= now) {
        await db.rateLimit.update({
          where: { id: record.id },
          data: {
            requests: 1,
            windowStart: now,
            expiresAt: new Date(now.getTime() + windowMs),
          },
        });
        return { allowed: true, remaining: maxRequests - 1 } as const;
      }
      if (record.requests >= maxRequests) {
        return { allowed: false, remaining: 0 } as const;
      }
      const newCount = record.requests + 1;
      await db.rateLimit.update({
        where: { id: record.id },
        data: { requests: newCount },
      });
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - newCount),
      } as const;
    }
  } catch {
    // Fallback to a very restrictive in-memory limiter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = global as unknown as {
      __webhookFallbackLimits?: Map<
        string,
        { count: number; windowStart: number }
      >;
    };
    if (!g.__webhookFallbackLimits) g.__webhookFallbackLimits = new Map();
    const key = `${identifier}:webhook`;
    const nowMs = Date.now();
    const fallbackWindowMs = 60 * 1000;
    const fallbackMax = 10; // extra strict fallback
    const current = g.__webhookFallbackLimits.get(key) || {
      count: 0,
      windowStart: nowMs,
    };
    if (nowMs - current.windowStart > fallbackWindowMs) {
      current.count = 0;
      current.windowStart = nowMs;
    }
    if (current.count >= fallbackMax) {
      logger.warn({ identifier }, "Webhook fallback rate limit exceeded");
      return { allowed: false, remaining: 0 } as const;
    }
    current.count++;
    g.__webhookFallbackLimits.set(key, current);
    logger.warn(
      { identifier, count: current.count },
      "Using webhook fallback rate limiter",
    );
    return { allowed: true, remaining: fallbackMax - current.count } as const;
  }
}

/**
 * Log webhook event to database
 */
async function logWebhookEvent(
  eventType: string,
  payload: unknown,
  success: boolean,
  error?: string,
): Promise<void> {
  try {
    await db.webhookLog.create({
      data: {
        eventType: `github-app:${eventType}`,
        payload: JSON.stringify(payload),
        success,
        error: error || null,
      },
    });
  } catch (logError) {
    // Log to console if database logging fails
    logger.error("Failed to log webhook event:", logError);
  }
}

/**
 * Handle GitHub App installation events
 */
async function handleInstallationEvent(
  payload: GitHubInstallationEvent,
  action: string,
) {
  const installation = payload.installation;

  if (action === "created") {
    await db.$transaction(async (prisma) => {
      // Install app
      await prisma.gitHubInstallation.upsert({
        where: { id: installation.id },
        update: {
          accountId: BigInt(installation.account.id),
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          targetType: installation.target_type,
          permissions: JSON.stringify(installation.permissions),
          events: JSON.stringify(installation.events),
          singleFileName: installation.single_file_name,
          repositorySelection: installation.repository_selection,
          suspendedAt: installation.suspended_at
            ? new Date(installation.suspended_at)
            : null,
          suspendedBy: installation.suspended_by?.login || null,
          updatedAt: new Date(),
        },
        create: {
          id: installation.id,
          accountId: BigInt(installation.account.id),
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          targetType: installation.target_type,
          permissions: JSON.stringify(installation.permissions),
          events: JSON.stringify(installation.events),
          singleFileName: installation.single_file_name,
          repositorySelection: installation.repository_selection,
          suspendedAt: installation.suspended_at
            ? new Date(installation.suspended_at)
            : null,
          suspendedBy: installation.suspended_by?.login || null,
        },
      });

      // Add all repositories if "all" selection
      if (installation.repository_selection === "all" && payload.repositories) {
        await Promise.all(
          payload.repositories.map((repo: GitHubRepository) => {
            // Extract owner from full_name since installation webhooks don't include owner object
            const owner = repo.full_name.split("/")[0] || "unknown";

            return prisma.installationRepository.upsert({
              where: {
                installationId_repositoryId: {
                  installationId: installation.id,
                  repositoryId: BigInt(repo.id),
                },
              },
              update: {
                name: repo.name,
                fullName: repo.full_name,
                owner: owner,
                private: repo.private,
                htmlUrl:
                  repo.html_url || `https://github.com/${repo.full_name}`,
                description: repo.description,
                removedAt: null, // Reset if previously removed
              },
              create: {
                installationId: installation.id,
                repositoryId: BigInt(repo.id),
                name: repo.name,
                fullName: repo.full_name,
                owner: owner,
                private: repo.private,
                htmlUrl:
                  repo.html_url || `https://github.com/${repo.full_name}`,
                description: repo.description,
              },
            });
          }),
        );
      }

      // Note: Label creation is now handled through the user-driven setup process
      // Users can choose during installation whether to create labels automatically
      logger.info(
        `Installation ${installation.id} completed. Labels will be created based on user preference.`,
      );
    });

    logger.info(
      `GitHub App installed for ${installation.account.login} (${installation.id})`,
    );
  } else if (action === "deleted") {
    await db.$transaction(async (prisma) => {
      // Uninstall app - mark installation as suspended
      await prisma.gitHubInstallation.update({
        where: { id: installation.id },
        data: {
          suspendedAt: new Date(),
          suspendedBy: "uninstalled",
          updatedAt: new Date(),
          userAccessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          refreshTokenExpiresAt: null,
        },
      });

      // Mark all repositories as removed
      await prisma.installationRepository.updateMany({
        where: { installationId: installation.id },
        data: { removedAt: new Date() },
      });
    });

    logger.info(
      `GitHub App uninstalled for ${installation.account.login} (${installation.id})`,
    );
  } else if (action === "suspend") {
    await db.gitHubInstallation.update({
      where: { id: installation.id },
      data: {
        suspendedAt: installation.suspended_at
          ? new Date(installation.suspended_at)
          : null,
        suspendedBy: installation.suspended_by?.login || null,
        updatedAt: new Date(),
      },
    });

    logger.info(
      `GitHub App suspended for ${installation.account.login} (${installation.id})`,
    );
  } else if (action === "unsuspend") {
    await db.gitHubInstallation.update({
      where: { id: installation.id },
      data: {
        suspendedAt: null,
        suspendedBy: null,
        updatedAt: new Date(),
      },
    });

    logger.info(
      `GitHub App unsuspended for ${installation.account.login} (${installation.id})`,
    );
  }
}

/**
 * Handle installation repository events
 */
async function handleInstallationRepositoriesEvent(
  payload: GitHubInstallationRepositoriesEvent,
  action: string,
) {
  const installation = payload.installation;
  const repositories =
    payload.repositories_added || payload.repositories_removed || [];

  if (action === "added") {
    await db.$transaction(async (prisma) => {
      await Promise.all(
        repositories.map((repo: GitHubRepository) => {
          // Extract owner from full_name since installation repository webhooks may not include owner object
          const owner =
            repo.owner?.login || repo.full_name.split("/")[0] || "unknown";

          return prisma.installationRepository.upsert({
            where: {
              installationId_repositoryId: {
                installationId: installation.id,
                repositoryId: BigInt(repo.id),
              },
            },
            update: {
              name: repo.name,
              fullName: repo.full_name,
              owner: owner,
              private: repo.private,
              htmlUrl: repo.html_url || `https://github.com/${repo.full_name}`,
              description: repo.description,
              removedAt: null, // Reset if previously removed
            },
            create: {
              installationId: installation.id,
              repositoryId: BigInt(repo.id),
              name: repo.name,
              fullName: repo.full_name,
              owner: owner,
              private: repo.private,
              htmlUrl: repo.html_url || `https://github.com/${repo.full_name}`,
              description: repo.description,
            },
          });
        }),
      );

      // Note: Label creation for new repositories should be handled based on user preferences
      // Check if user has "all" preference and create labels accordingly
      logger.info(
        `${repositories.length} repositories added to installation ${installation.id}`,
      );

      // Check user's label preference for this installation
      const labelPreference = await prisma.labelPreference.findUnique({
        where: { installationId: installation.id },
      });

      if (labelPreference?.setupType === "all") {
        // User chose to create labels in all repositories, so create them for new repos
        logger.info(
          `Creating Jules labels in ${repositories.length} newly added repositories`,
        );

        await Promise.allSettled(
          repositories.map(async (repo) => {
            const owner =
              repo.owner?.login || repo.full_name.split("/")[0] || "unknown";

            // Save repository to label preferences
            await prisma.labelPreferenceRepository.create({
              data: {
                labelPreferenceId: labelPreference.id,
                repositoryId: BigInt(repo.id),
                name: repo.name,
                fullName: repo.full_name,
                owner: owner,
              },
            });

            // Create labels in the repository
            return createJulesLabelsForRepository(
              owner,
              repo.name,
              installation.id,
            );
          }),
        );
      }

      logger.info(
        `Added ${repositories.length} repositories to installation ${installation.id}`,
      );
    });
  } else if (action === "removed") {
    await db.$transaction(async (prisma) => {
      await Promise.all(
        repositories.map((repo: GitHubRepository) =>
          prisma.installationRepository.updateMany({
            where: {
              installationId: installation.id,
              repositoryId: BigInt(repo.id),
            },
            data: { removedAt: new Date() },
          }),
        ),
      );

      logger.info(
        `Removed ${repositories.length} repositories from installation ${installation.id}`,
      );
    });
  }
}

/**
 * Process GitHub App webhook events
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let eventType = "unknown";
  let payload: unknown = null;

  try {
    // Basic rate limiting per source IP
    const realIpHeader = req.headers.get("x-real-ip");
    let ipSource =
      realIpHeader || req.headers.get("x-forwarded-for") || "unknown";
    // Parse X-Forwarded-For first entry if multiple
    if (!realIpHeader && ipSource.includes(",")) {
      ipSource = ipSource.split(",")[0]?.trim() || ipSource;
    }
    // Normalize and bound the identifier length
    const normalizedIp = ipSource.toLowerCase().slice(0, 64);
    // Optionally append user agent (truncated) to reduce spoofing
    const userAgent = (req.headers.get("user-agent") || "")
      .toLowerCase()
      .slice(0, 32);
    const identifier = userAgent
      ? `${normalizedIp}|${userAgent}`
      : normalizedIp;
    const rate = await checkRateLimit(identifier);
    if (!rate.allowed) {
      await logWebhookEvent(eventType, payload, false, "Rate limit exceeded");
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify content type
    const contentType = req.headers.get("content-type");
    if (contentType !== "application/json") {
      await logWebhookEvent(eventType, payload, false, "Invalid content type");
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    // Get GitHub event type
    eventType = req.headers.get("x-github-event") || "unknown";

    // Parse payload
    const payloadText = await req.text();
    payload = JSON.parse(payloadText);

    // Verify signature
    const signature = req.headers.get("x-hub-signature-256");
    if (!signature) {
      // Allow unsigned webhooks only in development when secret is not configured
      if (!(env.NODE_ENV === "development" && !env.GITHUB_APP_WEBHOOK_SECRET)) {
        await logWebhookEvent(
          eventType,
          payload,
          false,
          "Missing signature header",
        );
        return NextResponse.json(
          { error: "Missing X-Hub-Signature-256 header" },
          { status: 401 },
        );
      }
    }

    if (signature && !verifyGitHubAppSignature(payloadText, signature)) {
      await logWebhookEvent(eventType, payload, false, "Invalid signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    const webhookEvent = payload as GitHubWebhookEvent;

    // Handle installation events
    if (eventType === "installation") {
      const installationEvent =
        webhookEvent as unknown as GitHubInstallationEvent;
      await handleInstallationEvent(
        installationEvent,
        installationEvent.action,
      );
      await logWebhookEvent(eventType, payload, true);

      return NextResponse.json({
        message: "Installation event processed successfully",
        eventType,
        action: installationEvent.action,
        installation: installationEvent.installation.id,
        processingTime: Date.now() - startTime,
      });
    }

    // Handle installation repository events
    if (eventType === "installation_repositories") {
      const repositoriesEvent =
        webhookEvent as unknown as GitHubInstallationRepositoriesEvent;
      await handleInstallationRepositoriesEvent(
        repositoriesEvent,
        repositoriesEvent.action,
      );
      await logWebhookEvent(eventType, payload, true);

      return NextResponse.json({
        message: "Installation repositories event processed successfully",
        eventType,
        action: repositoriesEvent.action,
        installation: repositoriesEvent.installation.id,
        processingTime: Date.now() - startTime,
      });
    }

    // Handle issue comment events
    if (eventType === "issue_comment") {
      // Only process comment creation for now
      if (webhookEvent.action !== "created") {
        await logWebhookEvent(
          eventType,
          payload,
          true,
          `Action '${webhookEvent.action}' ignored`,
        );
        return NextResponse.json({
          message: "Comment action not processed",
          action: webhookEvent.action,
          processingTime: Date.now() - startTime,
        });
      }

      const commentEvent = webhookEvent as unknown as GitHubIssueCommentEvent;

      // Check if the issue has 'jules' label
      const hasJulesLabel = commentEvent.issue.labels.some(
        (label: GitHubLabel) => label.name.toLowerCase() === "jules",
      );

      if (!hasJulesLabel) {
        await logWebhookEvent(
          eventType,
          payload,
          true,
          "Issue does not have 'jules' label",
        );
        return NextResponse.json({
          message: "Issue comment ignored - no 'jules' label",
          processingTime: Date.now() - startTime,
        });
      }

      // Log comment for monitoring Jules interactions
      logger.info(
        `New comment on Jules-labeled issue ${commentEvent.repository.full_name}#${commentEvent.issue.number} by ${commentEvent.comment.user.login}`,
      );

      // TODO: In the future, we could implement real-time comment processing here
      // For now, just log the event for monitoring purposes

      await logWebhookEvent(eventType, payload, true);

      return NextResponse.json({
        message: "Issue comment logged successfully",
        eventType,
        action: commentEvent.action,
        repository: commentEvent.repository.full_name,
        issue: commentEvent.issue.number,
        commenter: commentEvent.comment.user.login,
        installation: commentEvent.installation?.id,
        processingTime: Date.now() - startTime,
      });
    }

    // Handle issue events (same as before, but with installation context)
    if (eventType === "issues") {
      // Only process issue label events
      if (
        webhookEvent.action !== "labeled" &&
        webhookEvent.action !== "unlabeled"
      ) {
        await logWebhookEvent(
          eventType,
          payload,
          true,
          `Action '${webhookEvent.action}' ignored`,
        );
        return NextResponse.json({
          message: "Action not processed",
          action: webhookEvent.action,
          processingTime: Date.now() - startTime,
        });
      }

      // Parse as label event
      const labelEvent = GitHubLabelEventSchema.parse(payload);

      // Only process 'jules' and 'jules-queue' label events
      const labelName = labelEvent.label.name.toLowerCase();
      if (!["jules", "jules-queue"].includes(labelName)) {
        await logWebhookEvent(
          eventType,
          payload,
          true,
          `Label '${labelName}' ignored`,
        );
        return NextResponse.json({
          message: "Label not processed",
          label: labelName,
          processingTime: Date.now() - startTime,
        });
      }

      // Only process open issues
      if (labelEvent.issue.state !== "open") {
        await logWebhookEvent(eventType, payload, true, "Issue not open");
        return NextResponse.json({
          message: "Issue not open",
          state: labelEvent.issue.state,
          processingTime: Date.now() - startTime,
        });
      }

      // Process the Jules label event with installation context
      logger.info(
        `Processing ${labelEvent.action} event for label '${labelName}' on ${labelEvent.repository.full_name}#${labelEvent.issue.number} (installation: ${webhookEvent.installation?.id})`,
      );

      const result = await processJulesLabelEvent(
        labelEvent,
        webhookEvent.installation?.id,
      );

      await logWebhookEvent(eventType, payload, true);

      return NextResponse.json({
        message: "Webhook processed successfully",
        eventType,
        action: labelEvent.action,
        label: labelName,
        repository: labelEvent.repository.full_name,
        issue: labelEvent.issue.number,
        installation: webhookEvent.installation?.id,
        result,
        processingTime: Date.now() - startTime,
      });
    }

    // Ignore other event types
    await logWebhookEvent(eventType, payload, true, "Event type ignored");
    return NextResponse.json({
      message: "Event type not processed",
      eventType,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("GitHub App webhook processing error:", {
      eventType,
      error: errorMessage,
      payload: payload ? JSON.stringify(payload).slice(0, 500) : null,
    });

    await logWebhookEvent(eventType, payload, false, errorMessage);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          details: error.errors,
          processingTime: Date.now() - startTime,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
        processingTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Health check endpoint for GitHub App webhooks
 */
export async function GET() {
  try {
    // Test database connectivity
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      service: "GitHub App webhook handler",
      database: "connected",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV === "production" ? undefined : env.NODE_ENV,
      webhookSecretConfigured:
        env.NODE_ENV === "production"
          ? undefined
          : !!env.GITHUB_APP_WEBHOOK_SECRET,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        service: "GitHub App webhook handler",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
