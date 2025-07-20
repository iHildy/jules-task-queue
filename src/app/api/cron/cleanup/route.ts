import { env } from "@/lib/env";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  try {
    const now = new Date();

    // 1. Clean up expired refresh tokens
    const expiredTokensResult = await db.gitHubInstallation.updateMany({
      where: {
        refresh_token_expires_at: {
          lt: now,
        },
      },
      data: {
        user_access_token: null,
        refresh_token: null,
        token_expires_at: null,
        refresh_token_expires_at: null,
      },
    });

    // 2. Clean up old, uninstalled installations (e.g., older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oldInstallationsResult = await db.gitHubInstallation.deleteMany({
      where: {
        suspendedAt: {
          lt: thirtyDaysAgo,
        },
        suspendedBy: "uninstalled",
      },
    });

    const response = {
      message: "Cleanup cron job executed successfully.",
      cleanedExpiredTokens: expiredTokensResult.count,
      deletedOldInstallations: oldInstallationsResult.count,
      timestamp: new Date().toISOString(),
    };

    console.log("[Cron Cleanup]", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Cron Cleanup] Error executing cleanup job:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
