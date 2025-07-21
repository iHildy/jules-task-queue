import { encrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import logger from "@/lib/logger";
import { db } from "@/server/db";
import * as crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Global fallback rate limiting storage
declare global {
  var fallbackRateLimits:
    | Map<string, { count: number; windowStart: number }>
    | undefined;
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
    // Clean up expired rate limit entries first
    await db.rateLimit.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // Get existing rate limit record
    const existingLimit = await db.rateLimit.findUnique({
      where: {
        identifier_endpoint: {
          identifier,
          endpoint,
        },
      },
    });

    if (!existingLimit) {
      // First request in window - create new record
      await db.rateLimit.create({
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
      await db.rateLimit.update({
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
    await db.rateLimit.update({
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

    // SECURITY FIX: Do NOT allow all requests on error
    // Instead use a restrictive fallback rate limiter

    // Simple in-memory fallback with strict limits
    const fallbackKey = `${identifier}:fallback`;
    const now = Date.now();
    const fallbackWindowMs = 60 * 1000; // 1 minute
    const fallbackMaxRequests = 2; // Very restrictive

    // Get or create fallback entry
    if (!global.fallbackRateLimits) {
      global.fallbackRateLimits = new Map();
    }

    const existing = global.fallbackRateLimits.get(fallbackKey);

    // Clean expired entries
    if (existing && now - existing.windowStart > fallbackWindowMs) {
      global.fallbackRateLimits.delete(fallbackKey);
    }

    const current = global.fallbackRateLimits.get(fallbackKey) || {
      count: 0,
      windowStart: now,
    };

    // Check if limit exceeded
    if (current.count >= fallbackMaxRequests) {
      logger.warn(
        { identifier, count: current.count, maxRequests: fallbackMaxRequests },
        "Fallback rate limit exceeded - denying request",
      );
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(current.windowStart + fallbackWindowMs),
      };
    }

    // Increment counter
    current.count++;
    global.fallbackRateLimits.set(fallbackKey, current);

    logger.warn(
      { identifier, count: current.count, maxRequests: fallbackMaxRequests },
      "Using fallback rate limiter due to database error",
    );

    return {
      allowed: true,
      remaining: fallbackMaxRequests - current.count,
      resetTime: new Date(current.windowStart + fallbackWindowMs),
    };
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
  const state = searchParams.get("state");

  // Log the incoming request details for debugging
  logger.info("OAuth callback received", {
    url: request.url,
    state,
    code: code ? "present" : "missing",
    installationId: searchParams.get("installation_id"),
    setupAction: searchParams.get("setup_action"),
  });

  // CSRF Protection
  const oauthStateCookie = (await cookies()).get("oauth_state");

  // Handle the case where GitHub uses its own state parameter (success URL)
  // vs our custom state with installation_id
  let stateValidationPassed = false;
  let stateData: {
    state: string;
    installationId: string;
    redirectTo: string;
  } | null = null;

  if (state) {
    try {
      // Try to validate with our custom state format first (if we have a cookie)
      if (oauthStateCookie) {
        // Try to decode as base64 JSON first (new format)
        try {
          const decodedState = Buffer.from(state, "base64").toString("utf-8");
          const parsedStateData = JSON.parse(decodedState);

          if (
            parsedStateData.state &&
            parsedStateData.installationId &&
            parsedStateData.redirectTo
          ) {
            // This is our new base64-encoded format
            stateData = parsedStateData;
            stateValidationPassed = crypto.timingSafeEqual(
              Buffer.from(state),
              Buffer.from(oauthStateCookie.value),
            );
          }
        } catch {
          // Not base64 JSON, try old colon-separated format
          if (state.includes(":") && oauthStateCookie) {
            // Our old custom state format: {randomHex}:{installationId}:{redirectTo}
            stateValidationPassed = crypto.timingSafeEqual(
              Buffer.from(state),
              Buffer.from(oauthStateCookie.value),
            );

            if (stateValidationPassed) {
              const stateParts = state.split(":");
              if (stateParts.length >= 3) {
                stateData = {
                  state: stateParts[0] || "",
                  installationId: stateParts[1] || "",
                  redirectTo: stateParts[2] || "/github-app/success",
                };
              }
            }
          }
        }
      }

      // If still not validated, check for GitHub's automatic OAuth flow
      if (!stateValidationPassed) {
        // GitHub's state format: just the success URL (may be URL-encoded)
        // Handle both single and double encoding
        let decodedState = state;
        try {
          // Try single decode first
          decodedState = decodeURIComponent(state);
        } catch {
          try {
            // If that fails, try double decode
            decodedState = decodeURIComponent(decodeURIComponent(state));
          } catch {
            // If both fail, use original state
            decodedState = state;
          }
        }

        // Check if the decoded state contains our expected redirect path
        if (decodedState.includes("/github-app/success")) {
          // This is likely GitHub's automatic OAuth flow during installation
          // We'll accept this state and try to get installation_id from URL params
          stateValidationPassed = true;
          logger.info("GitHub-initiated OAuth flow detected, accepting state", {
            originalState: state,
            decodedState,
            hasCookie: !!oauthStateCookie,
          });
        }
      }
    } catch (error) {
      logger.error(
        { error, state, cookieValue: oauthStateCookie?.value },
        "State validation error",
      );
    }
  }

  if (!stateValidationPassed) {
    logger.error(
      { state, oauthStateCookie: oauthStateCookie?.value },
      "CSRF state validation failed",
    );
    return NextResponse.json(
      { error: "Invalid or missing CSRF state" },
      { status: 422 },
    );
  }

  // Clear the state cookie after successful validation
  (await cookies()).delete("oauth_state");

  // Extract installation_id and redirect_to from state
  let installationIdParam: string | null = null;
  let redirectTo = "/github-app/success";

  if (stateData) {
    // We have parsed state data from our custom format
    installationIdParam = stateData.installationId;
    redirectTo = stateData.redirectTo;
  } else if (state) {
    // Fallback to old parsing logic for backward compatibility
    const stateParts = state.split(":");
    if (stateParts.length >= 3) {
      // Manual OAuth flow - installation_id is in state
      installationIdParam = stateParts[1] || null;
      redirectTo = stateParts[2] || "/github-app/success";
    } else if (stateParts.length === 1) {
      // GitHub-initiated OAuth flow - no installation_id in state
      // We need to find the installation from the current session or recent installations
      // For now, we'll redirect to success page and let the user reinstall if needed
      logger.info(
        "GitHub-initiated OAuth flow detected, no installation_id in state",
      );
      redirectTo = "/github-app/success";
    } else {
      logger.error({ state }, "Invalid state format");
      return NextResponse.json(
        { error: "Invalid state format" },
        { status: 400 },
      );
    }
  }

  // If no installation_id from state, try to get it from URL params (fallback)
  if (!installationIdParam) {
    installationIdParam = searchParams.get("installation_id");
  }

  if (!code) {
    logger.error("Missing OAuth code");
    return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
  }

  // If we still don't have an installation_id, we can't proceed
  if (!installationIdParam) {
    logger.error("No installation_id found in OAuth callback");
    return NextResponse.json(
      { error: "Installation ID not found. Please reinstall the GitHub App." },
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
          client_id: env.GITHUB_APP_CLIENT_ID,
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

      // Handle specific OAuth errors
      if (data.error === "bad_verification_code") {
        return NextResponse.json(
          {
            error: "OAuth code expired",
            message:
              "The authorization code has expired. Please try installing the app again.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error: data.error,
          message: data.error_description || "OAuth authorization failed",
        },
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
    // If it doesn't exist, create it (this handles the case where OAuth happens before webhook)
    let existingInstallation = await db.gitHubInstallation.findUnique({
      where: { id: installationId },
    });

    if (!existingInstallation) {
      logger.info(
        { installationId },
        "Installation not found in database, creating it from OAuth callback",
      );

      // Create a minimal installation record - the webhook will update it with full details later
      existingInstallation = await db.gitHubInstallation.create({
        data: {
          id: installationId,
          accountId: 0, // Will be updated by webhook
          accountLogin: "unknown", // Will be updated by webhook
          accountType: "User", // Will be updated by webhook
          targetType: "User", // Will be updated by webhook
          permissions: "{}", // Will be updated by webhook
          events: "[]", // Will be updated by webhook
          repositorySelection: "all", // Will be updated by webhook
        },
      });
    }

    await db.gitHubInstallation.update({
      where: { id: installationId },
      data: {
        userAccessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        tokenExpiresAt: tokenExpiresAt,
        refreshTokenExpiresAt: refreshTokenExpiresAt,
      },
    });

    // Redirect to a success page
    const baseUrl = new URL(env.GITHUB_APP_CALLBACK_URL).origin;
    const successUrl = new URL(redirectTo, baseUrl);
    successUrl.searchParams.set("installation_id", installationId.toString());
    successUrl.searchParams.set("setup_action", "install");

    logger.info("Redirecting to success page", {
      installationId,
      redirectUrl: successUrl.toString(),
    });

    return NextResponse.redirect(successUrl);
  } catch (error) {
    logger.error({ error }, "OAuth callback error");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
