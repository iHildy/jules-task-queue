import { env } from "@/lib/env";
import { githubAppClient } from "@/lib/github-app";
import logger from "@/lib/logger";
import { db } from "@/server/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type HealthStatus = "ok" | "error" | "not_configured";

interface HealthCheck {
  database: HealthStatus;
  githubApp: HealthStatus;
  webhook: HealthStatus;
}

interface HealthResponse {
  status: "healthy" | "unhealthy" | "ok" | "error";
  timestamp?: string;
  version?: string;
  uptime?: number;
  environment?: string;
  checks?: HealthCheck;
}

async function checkDatabase(): Promise<HealthStatus> {
  try {
    await db.$queryRaw`SELECT 1`;
    return "ok";
  } catch (error) {
    logger.error(error, "Database health check failed");
    return "error";
  }
}

async function checkGitHubApp(): Promise<HealthStatus> {
  if (!githubAppClient.isConfigured()) {
    return "not_configured";
  }
  try {
    await githubAppClient.getAppInfo();
    return "ok";
  } catch (error) {
    logger.error(error, "GitHub App health check failed");
    return "error";
  }
}

function checkWebhook(): HealthStatus {
  return env.GITHUB_APP_WEBHOOK_SECRET ? "ok" : "not_configured";
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  // Minimal mode for public environments: only status code and generic body
  if (env.NODE_ENV === "production") {
    const dbStatus = await checkDatabase();
    const appStatus = await checkGitHubApp();
    const hasError = [dbStatus, appStatus].some((s) => s === "error");
    const httpStatus = hasError ? 503 : 200;
    return NextResponse.json(
      { status: httpStatus === 200 ? "ok" : "error" },
      { status: httpStatus },
    );
  }

  const checks: HealthCheck = {
    database: await checkDatabase(),
    githubApp: await checkGitHubApp(),
    webhook: checkWebhook(),
  };

  const hasError = Object.values(checks).some((status) => status === "error");
  const overallStatus = hasError ? "unhealthy" : "healthy";
  const httpStatus = hasError ? 503 : 200;

  const responsePayload: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    checks,
  };

  return NextResponse.json(responsePayload, { status: httpStatus });
}
