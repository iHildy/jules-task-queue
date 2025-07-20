import { env } from "@/lib/env";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import logger from "@/lib/logger";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const expectedAuthHeader = `Bearer ${env.CRON_SECRET}`;

  if (
    !authHeader ||
    !crypto.timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(expectedAuthHeader),
    )
  ) {
    logger.warn("Unauthorized access to cleanup cron job");
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  try {
    const now = new Date();

    const [expiredTokensResult, oldInstallationsResult] = await db.$transaction(
      async (prisma: Prisma.TransactionClient) => {
        // 1. Clean up expired refresh tokens
        const expiredTokens = await prisma.gitHubInstallation.updateMany({
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
        const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_IN_MS);
        const oldInstallations = await prisma.gitHubInstallation.deleteMany({
          where: {
            suspendedAt: {
              lt: thirtyDaysAgo,
            },
            suspendedBy: "uninstalled",
          },
        });
        return [expiredTokens, oldInstallations] as const;
      },
    );

    const response = {
      message: "Cleanup cron job executed successfully.",
      cleanedExpiredTokens: expiredTokensResult.count,
      deletedOldInstallations: oldInstallationsResult.count,
      timestamp: new Date().toISOString(),
    };

    logger.info(
      { response },
      "[Cron Cleanup] Cleanup cron job executed successfully.",
    );

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, "[Cron Cleanup] Error executing cleanup job:");
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
