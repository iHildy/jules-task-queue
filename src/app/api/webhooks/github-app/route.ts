import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { processJulesLabelEvent } from "@/lib/webhook-processor";
import { db } from "@/server/db";
import { GitHubLabelEventSchema } from "@/types";

/**
 * Verify GitHub App webhook signature
 */
function verifyGitHubAppSignature(payload: string, signature: string): boolean {
  if (!env.GITHUB_APP_WEBHOOK_SECRET) {
    console.warn(
      "GITHUB_APP_WEBHOOK_SECRET not configured - webhook verification disabled",
    );
    return true; // Allow in development if not configured
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
    console.error("Failed to log webhook event:", logError);
  }
}

/**
 * Handle GitHub App installation events
 */
async function handleInstallationEvent(payload: any, action: string) {
  const installation = payload.installation;
  
  if (action === "created") {
    // Install app
    await db.gitHubInstallation.upsert({
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
        suspendedAt: installation.suspended_at ? new Date(installation.suspended_at) : null,
        suspendedBy: installation.suspended_by?.login,
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
        suspendedAt: installation.suspended_at ? new Date(installation.suspended_at) : null,
        suspendedBy: installation.suspended_by?.login,
      },
    });

    // Add all repositories if "all" selection
    if (installation.repository_selection === "all" && payload.repositories) {
      await Promise.all(
        payload.repositories.map((repo: any) =>
          db.installationRepository.upsert({
            where: {
              installationId_repositoryId: {
                installationId: installation.id,
                repositoryId: BigInt(repo.id),
              },
            },
            update: {
              name: repo.name,
              fullName: repo.full_name,
              owner: repo.owner.login,
              private: repo.private,
              htmlUrl: repo.html_url,
              description: repo.description,
              removedAt: null, // Reset if previously removed
            },
            create: {
              installationId: installation.id,
              repositoryId: BigInt(repo.id),
              name: repo.name,
              fullName: repo.full_name,
              owner: repo.owner.login,
              private: repo.private,
              htmlUrl: repo.html_url,
              description: repo.description,
            },
          })
        )
      );
    }

    console.log(`GitHub App installed for ${installation.account.login} (${installation.id})`);
  } else if (action === "deleted") {
    // Uninstall app - mark installation as suspended
    await db.gitHubInstallation.update({
      where: { id: installation.id },
      data: {
        suspendedAt: new Date(),
        suspendedBy: "uninstalled",
        updatedAt: new Date(),
      },
    });

    // Mark all repositories as removed
    await db.installationRepository.updateMany({
      where: { installationId: installation.id },
      data: { removedAt: new Date() },
    });

    console.log(`GitHub App uninstalled for ${installation.account.login} (${installation.id})`);
  } else if (action === "suspend") {
    await db.gitHubInstallation.update({
      where: { id: installation.id },
      data: {
        suspendedAt: new Date(installation.suspended_at),
        suspendedBy: installation.suspended_by?.login,
        updatedAt: new Date(),
      },
    });

    console.log(`GitHub App suspended for ${installation.account.login} (${installation.id})`);
  } else if (action === "unsuspend") {
    await db.gitHubInstallation.update({
      where: { id: installation.id },
      data: {
        suspendedAt: null,
        suspendedBy: null,
        updatedAt: new Date(),
      },
    });

    console.log(`GitHub App unsuspended for ${installation.account.login} (${installation.id})`);
  }
}

/**
 * Handle installation repository events
 */
async function handleInstallationRepositoriesEvent(payload: any, action: string) {
  const installation = payload.installation;
  const repositories = payload.repositories_added || payload.repositories_removed || [];

  if (action === "added") {
    await Promise.all(
      repositories.map((repo: any) =>
        db.installationRepository.upsert({
          where: {
            installationId_repositoryId: {
              installationId: installation.id,
              repositoryId: BigInt(repo.id),
            },
          },
          update: {
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            private: repo.private,
            htmlUrl: repo.html_url,
            description: repo.description,
            removedAt: null, // Reset if previously removed
          },
          create: {
            installationId: installation.id,
            repositoryId: BigInt(repo.id),
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            private: repo.private,
            htmlUrl: repo.html_url,
            description: repo.description,
          },
        })
      )
    );

    console.log(`Added ${repositories.length} repositories to installation ${installation.id}`);
  } else if (action === "removed") {
    await Promise.all(
      repositories.map((repo: any) =>
        db.installationRepository.updateMany({
          where: {
            installationId: installation.id,
            repositoryId: BigInt(repo.id),
          },
          data: { removedAt: new Date() },
        })
      )
    );

    console.log(`Removed ${repositories.length} repositories from installation ${installation.id}`);
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

    if (!verifyGitHubAppSignature(payloadText, signature)) {
      await logWebhookEvent(eventType, payload, false, "Invalid signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    const webhookEvent = payload as any;

    // Handle installation events
    if (eventType === "installation") {
      await handleInstallationEvent(webhookEvent, webhookEvent.action);
      await logWebhookEvent(eventType, payload, true);
      
      return NextResponse.json({
        message: "Installation event processed successfully",
        eventType,
        action: webhookEvent.action,
        installation: webhookEvent.installation.id,
        processingTime: Date.now() - startTime,
      });
    }

    // Handle installation repository events
    if (eventType === "installation_repositories") {
      await handleInstallationRepositoriesEvent(webhookEvent, webhookEvent.action);
      await logWebhookEvent(eventType, payload, true);
      
      return NextResponse.json({
        message: "Installation repositories event processed successfully",
        eventType,
        action: webhookEvent.action,
        installation: webhookEvent.installation.id,
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
      console.log(
        `Processing ${labelEvent.action} event for label '${labelName}' on ${labelEvent.repository.full_name}#${labelEvent.issue.number} (installation: ${webhookEvent.installation?.id})`,
      );

      const result = await processJulesLabelEvent(labelEvent, webhookEvent.installation?.id);

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

    console.error("GitHub App webhook processing error:", {
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
      environment: env.NODE_ENV,
      webhookSecretConfigured: !!env.GITHUB_APP_WEBHOOK_SECRET,
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