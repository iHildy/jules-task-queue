import {
  buildInstallationUrl,
  getInstallationError,
  validateGitHubAppConfig,
} from "@/lib/github-app-utils";
import logger from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * Redirect to GitHub App installation with enhanced error handling
 */
export async function GET(req: NextRequest) {
  try {
    // Validate GitHub App configuration
    const configValidation = validateGitHubAppConfig();
    if (!configValidation.valid) {
      logger.error(
        { errors: configValidation.errors },
        "GitHub App configuration invalid",
      );

      return NextResponse.json(
        {
          error: "GitHub App not configured",
          message:
            "The GitHub App is not properly configured. Please contact support.",
          details: configValidation.errors,
          errorCode: "MISSING_APP_NAME",
          userMessage:
            "GitHub App configuration is missing. Please contact support.",
          suggestedAction:
            "Contact your administrator to configure the GitHub App.",
        },
        { status: 500 },
      );
    }

    // Build installation URL using shared utility
    const result = buildInstallationUrl(req.url);

    if (!result.success) {
      const errorInfo = getInstallationError(result.errorCode || "UNKNOWN");

      logger.error(
        { error: result.error, errorCode: result.errorCode, url: req.url },
        "Failed to build installation URL",
      );

      return NextResponse.json(
        {
          error: result.error,
          errorCode: result.errorCode,
          userMessage: errorInfo.userMessage,
          suggestedAction: errorInfo.suggestedAction,
        },
        { status: 400 },
      );
    }

    // Log successful redirect for monitoring
    logger.info(
      { url: result.url, timestamp: new Date().toISOString() },
      "Redirecting to GitHub App installation",
    );

    // Redirect to GitHub App installation - result.url is guaranteed to exist when success is true
    return NextResponse.redirect(result.url!);
  } catch (error) {
    const errorInfo = getInstallationError("UNKNOWN");

    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        url: req.url,
        timestamp: new Date().toISOString(),
      },
      "Unexpected error in GitHub App installation",
    );

    return NextResponse.json(
      {
        error: "Failed to redirect to GitHub App installation",
        message: error instanceof Error ? error.message : "Unknown error",
        errorCode: "UNKNOWN",
        userMessage: errorInfo.userMessage,
        suggestedAction: errorInfo.suggestedAction,
      },
      { status: 500 },
    );
  }
}

/**
 * Health check endpoint for installation service
 */
export async function HEAD() {
  try {
    const configValidation = validateGitHubAppConfig();

    if (!configValidation.valid) {
      return new NextResponse(null, { status: 503 }); // Service unavailable
    }

    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
