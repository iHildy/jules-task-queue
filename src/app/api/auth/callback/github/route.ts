import { encrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import logger from "@/lib/logger";
import { db } from "@/server/db";
import * as crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  if (!env.GITHUB_APP_CALLBACK_URL) {
    logger.error("Missing GITHUB_APP_CALLBACK_URL env variable");
    return NextResponse.json(
      { error: "Server misconfiguration: missing callback URL" },
      { status: 500 },
    );
  }
  // Apply database-based rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rateLimitResult = await checkRateLimit(ip, "/api/auth/callback/github");

  if (!rateLimitResult.allowed) {
    logger.warn({ ip }, "Rate limit exceeded");
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Log minimal details. Do NOT log raw state value.
  logger.info("OAuth callback received", {
    url: new URL(request.url).origin,
    statePresent: Boolean(state),
    codePresent: Boolean(code),
    installationId: searchParams.get("installation_id") ? "present" : "missing",
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
          // Decode only when state is a non-empty string
          const decodedState =
            typeof state === "string" && state.length > 0
              ? Buffer.from(state, "base64").toString("utf-8")
              : "";
          const parsedStateData = JSON.parse(decodedState);

          if (
            parsedStateData.state &&
            parsedStateData.installationId &&
            parsedStateData.redirectTo
          ) {
            // This is our new base64-encoded format
            stateData = parsedStateData;
            // Compare only when both are strings of equal length to avoid Buffer.from(undefined)
            if (
              typeof state === "string" &&
              typeof oauthStateCookie.value === "string" &&
              state.length === oauthStateCookie.value.length
            ) {
              stateValidationPassed = crypto.timingSafeEqual(
                Buffer.from(state),
                Buffer.from(oauthStateCookie.value),
              );
            } else {
              stateValidationPassed = false;
            }
          }
        } catch {
          // Not base64 JSON, try old colon-separated format
          if (state.includes(":") && oauthStateCookie) {
            // Our old custom state format: {randomHex}:{installationId}:{redirectTo}
            // Compare only when both are strings of equal length to avoid Buffer.from(undefined)
            if (
              typeof state === "string" &&
              typeof oauthStateCookie.value === "string" &&
              state.length === oauthStateCookie.value.length
            ) {
              stateValidationPassed = crypto.timingSafeEqual(
                Buffer.from(state),
                Buffer.from(oauthStateCookie.value),
              );
            } else {
              stateValidationPassed = false;
            }

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
      { statePresent: Boolean(state) },
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
      logger.error({ statePresent: Boolean(state) }, "Invalid state format");
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
      existingInstallation = await db.gitHubInstallation.upsert({
        where: { id: installationId },
        create: {
          id: installationId,
          accountId: 0, // Will be updated by webhook
          accountLogin: "unknown", // Will be updated by webhook
          accountType: "User", // Will be updated by webhook
          targetType: "User", // Will be updated by webhook
          permissions: "{}", // Will be updated by webhook
          events: "[]", // Will be updated by webhook
          repositorySelection: "all", // Will be updated by webhook
        },
        update: {}, // No update needed if it already exists
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
