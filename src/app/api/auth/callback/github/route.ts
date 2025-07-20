import { encrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as crypto from "crypto";
import logger from "@/lib/logger";

// Type interface for rate limit operations
interface RateLimitClient {
  deleteMany: (args: {
    where: { expiresAt: { lt: Date } };
  }) => Promise<{ count: number }>;
  findUnique: (args: {
    where: {
      identifier_endpoint: {
        identifier: string;
        endpoint: string;
      };
    };
  }) => Promise<{
    id: number;
    identifier: string;
    endpoint: string;
    requests: number;
    windowStart: Date;
    expiresAt: Date;
  } | null>;
  create: (args: {
    data: {
      identifier: string;
      endpoint: string;
      requests: number;
      windowStart: Date;
      expiresAt: Date;
    };
  }) => Promise<unknown>;
  update: (args: {
    where: { id: number };
    data: {
      requests?: number;
      windowStart?: Date;
      expiresAt?: Date;
    };
  }) => Promise<unknown>;
}

// Database-based rate limiter for production use
async function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000, // 1 minute default
) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const endpoint = "/api/auth/callback/github";

  try {
    const rateLimitDb = db as unknown as { rateLimit: RateLimitClient };

    // Clean up expired rate limit entries first
    await rateLimitDb.rateLimit.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // Get existing rate limit record
    const existingLimit = await rateLimitDb.rateLimit.findUnique({
      where: {
        identifier_endpoint: {
          identifier,
          endpoint,
        },
      },
    });

    if (!existingLimit) {
      // First request in window - create new record
      await rateLimitDb.rateLimit.create({
        data: {
          identifier,
          endpoint,
          requests: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + windowMs),
        },
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: new Date(now.getTime() + windowMs),
      };
    }

    // Check if window has expired
    if (existingLimit.windowStart < windowStart) {
      // Window expired - reset counter
      await rateLimitDb.rateLimit.update({
        where: { id: existingLimit.id },
        data: {
          requests: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + windowMs),
        },
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: new Date(now.getTime() + windowMs),
      };
    }

    // Window is still active
    if (existingLimit.requests >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: existingLimit.expiresAt,
      };
    }

    // Increment counter
    await rateLimitDb.rateLimit.update({
      where: { id: existingLimit.id },
      data: {
        requests: existingLimit.requests + 1,
      },
    });

    return {
      allowed: true,
      remaining: maxRequests - existingLimit.requests - 1,
      resetTime: existingLimit.expiresAt,
    };
  } catch (error) {
    logger.error({ error, identifier, endpoint }, "Rate limit check failed");
    // On error, allow the request to prevent blocking legitimate users
    return { allowed: true };
  }
}

export async function GET(request: NextRequest) {
  // Apply database-based rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rateLimitResult = await checkRateLimit(ip);

  if (!rateLimitResult.allowed) {
    logger.warn({ ip }, "Rate limit exceeded");
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const installationIdParam = searchParams.get("installation_id");
  const state = searchParams.get("state");

  // CSRF Protection
  const oauthStateCookie = (await cookies()).get("oauth_state");
  if (
    !state ||
    !oauthStateCookie ||
    !crypto.timingSafeEqual(
      Buffer.from(state),
      Buffer.from(oauthStateCookie.value),
    )
  ) {
    logger.error(
      { state, oauthStateCookie: oauthStateCookie?.value },
      "CSRF state mismatch or missing",
    );
    return NextResponse.json(
      { error: "Invalid or missing CSRF state" },
      { status: 422 },
    );
  }
  // Clear the state cookie after successful validation
  (await cookies()).delete("oauth_state");

  if (!code || !installationIdParam) {
    logger.error(
      { code: !!code, installationId: !!installationIdParam },
      "Missing code or installation_id",
    );
    return NextResponse.json(
      { error: "Missing code or installation_id" },
      { status: 400 },
    );
  }

  // Validate installation_id as a numeric value
  const installationId = Number(installationIdParam);
  if (!Number.isInteger(installationId)) {
    logger.error(
      { installationIdParam },
      "Invalid installation_id: not a number",
    );
    return NextResponse.json(
      { error: "Invalid installation_id" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.NEXT_PUBLIC_GITHUB_APP_ID,
          client_secret: env.GITHUB_APP_CLIENT_SECRET,
          code,
          redirect_uri: env.GITHUB_APP_CALLBACK_URL,
        }),
      },
    );

    const data = await response.json();

    if (data.error) {
      logger.error(
        { error: data.error, description: data.error_description },
        "Error exchanging code for token",
      );
      return NextResponse.json(
        { error: data.error_description },
        { status: 400 },
      );
    }

    const {
      access_token,
      refresh_token,
      expires_in,
      refresh_token_expires_in,
    } = data;

    if (
      !access_token ||
      !refresh_token ||
      typeof expires_in === "undefined" ||
      typeof refresh_token_expires_in === "undefined"
    ) {
      logger.error({ data }, "Missing required OAuth token fields");
      return NextResponse.json(
        { error: "Invalid OAuth response from GitHub" },
        { status: 500 },
      );
    }

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
    const refreshTokenExpiresAt = new Date(
      Date.now() + refresh_token_expires_in * 1000,
    );

    // Verify installation exists and belongs to the user (or is valid for update)
    const existingInstallation = await db.gitHubInstallation.findUnique({
      where: { id: installationId },
    });

    if (!existingInstallation) {
      logger.error(
        { installationId },
        "GitHub Installation not found for update",
      );
      return NextResponse.json(
        { error: "GitHub Installation not found" },
        { status: 404 },
      );
    }

    await db.gitHubInstallation.update({
      where: { id: installationId },
      data: {
        user_access_token: encrypt(access_token),
        refresh_token: encrypt(refresh_token),
        token_expires_at: tokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
      },
    });

    // Redirect to a success page
    return NextResponse.redirect(new URL("/github-app/success", request.url));
  } catch (error) {
    logger.error({ error }, "OAuth callback error");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
