import { env } from "@/lib/env";
import { githubAppClient } from "@/lib/github-app";
import { db } from "@/server/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Status = "ok" | "error" | "not_configured";

async function checkDatabase(): Promise<Status> {
  try {
    await db.$queryRaw`SELECT 1`;
    return "ok";
  } catch (error) {
    console.error("Database health check failed:", error);
    return "error";
  }
}

async function checkGitHubApp(): Promise<Status> {
  if (!githubAppClient.isConfigured()) {
    return "not_configured";
  }
  try {
    await githubAppClient.getAppInfo();
    return "ok";
  } catch (error) {
    console.error("GitHub App health check failed:", error);
    return "error";
  }
}

function checkWebhook(): Status {
  return env.GITHUB_APP_WEBHOOK_SECRET ? "ok" : "not_configured";
}

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    githubApp: await checkGitHubApp(),
    webhook: checkWebhook(),
  };

  const hasError = Object.values(checks).some((status) => status === "error");
  const overallStatus = hasError ? "unhealthy" : "healthy";
  const httpStatus = hasError ? 503 : 200;

  const responsePayload = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    checks,
  };

  return NextResponse.json(responsePayload, { status: httpStatus });
}
