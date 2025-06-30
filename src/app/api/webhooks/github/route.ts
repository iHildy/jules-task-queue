import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { processJulesLabelEvent } from "@/lib/webhook-processor";
import { db } from "@/server/db";
import { GitHubLabelEventSchema, GitHubWebhookEventSchema } from "@/types";

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload: string, signature: string): boolean {
  if (!env.GITHUB_WEBHOOK_SECRET) {
    console.warn(
      "GITHUB_WEBHOOK_SECRET not configured - webhook verification disabled",
    );
    return true; // Allow in development if not configured
  }

  if (!signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = signature.slice(7); // Remove 'sha256=' prefix
  const computedSignature = createHmac("sha256", env.GITHUB_WEBHOOK_SECRET)
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
        eventType,
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
 * Process GitHub webhook events
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

    if (!verifyGitHubSignature(payloadText, signature)) {
      await logWebhookEvent(eventType, payload, false, "Invalid signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    // Validate basic webhook structure
    const webhookEvent = GitHubWebhookEventSchema.parse(payload);

    // Only process issue label events
    if (eventType !== "issues") {
      await logWebhookEvent(eventType, payload, true, "Event type ignored");
      return NextResponse.json({
        message: "Event type not processed",
        eventType,
        processingTime: Date.now() - startTime,
      });
    }

    // Validate as label event
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

    // Process the Jules label event
    console.log(
      `Processing ${labelEvent.action} event for label '${labelName}' on ${labelEvent.repository.full_name}#${labelEvent.issue.number}`,
    );

    const result = await processJulesLabelEvent(labelEvent);

    await logWebhookEvent(eventType, payload, true);

    return NextResponse.json({
      message: "Webhook processed successfully",
      eventType,
      action: labelEvent.action,
      label: labelName,
      repository: labelEvent.repository.full_name,
      issue: labelEvent.issue.number,
      result,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Webhook processing error:", {
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
 * Health check endpoint for webhooks
 */
export async function GET() {
  try {
    // Test database connectivity
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      service: "GitHub webhook handler",
      database: "connected",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      webhookSecretConfigured: !!env.GITHUB_WEBHOOK_SECRET,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        service: "GitHub webhook handler",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
