import { env } from "@/lib/env";

/**
 * GitHub App installation utilities
 */

export interface InstallationResult {
  success: boolean;
  url?: string;
  error?: string;
  errorCode?: string;
}

export interface InstallationError {
  code: string;
  message: string;
  userMessage: string;
  suggestedAction?: string;
}

/**
 * Common installation error types
 */
export const INSTALLATION_ERRORS = {
  MISSING_APP_NAME: {
    code: "MISSING_APP_NAME",
    message: "GitHub App name is not configured",
    userMessage: "GitHub App configuration is missing. Please contact support.",
    suggestedAction:
      "Contact your administrator to configure NEXT_PUBLIC_GITHUB_APP_NAME environment variable.",
  },
  INVALID_URL: {
    code: "INVALID_URL",
    message: "Invalid request URL",
    userMessage: "Unable to determine the application URL. Please try again.",
    suggestedAction: "Check your browser URL and try refreshing the page.",
  },
  NETWORK_ERROR: {
    code: "NETWORK_ERROR",
    message: "Network error during installation",
    userMessage:
      "Unable to connect to GitHub. Please check your internet connection.",
    suggestedAction: "Check your internet connection and try again.",
  },
  PERMISSION_DENIED: {
    code: "PERMISSION_DENIED",
    message: "Insufficient permissions",
    userMessage:
      "You don't have permission to install this app on the selected repository.",
    suggestedAction:
      "Contact the repository owner to request installation permissions.",
  },
  RATE_LIMITED: {
    code: "RATE_LIMITED",
    message: "GitHub API rate limit exceeded",
    userMessage:
      "Too many installation attempts. Please wait a moment before trying again.",
    suggestedAction: "Wait a few minutes and try again.",
  },
  UNKNOWN: {
    code: "UNKNOWN",
    message: "Unknown error occurred",
    userMessage: "An unexpected error occurred. Please try again.",
    suggestedAction: "If the problem persists, please contact support.",
  },
} as const;

/**
 * Build GitHub App installation URL
 */
export function buildInstallationUrl(baseUrl: string): InstallationResult {
  try {
    // Validate base URL
    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      return {
        success: false,
        error: INSTALLATION_ERRORS.INVALID_URL.message,
        errorCode: INSTALLATION_ERRORS.INVALID_URL.code,
      };
    }

    // Check if app name is configured
    const appName = env.NEXT_PUBLIC_GITHUB_APP_NAME;
    if (!appName || appName.trim() === "") {
      return {
        success: false,
        error: INSTALLATION_ERRORS.MISSING_APP_NAME.message,
        errorCode: INSTALLATION_ERRORS.MISSING_APP_NAME.code,
      };
    }

    // Build callback URL
    const callbackUrl = `${parsedBaseUrl.origin}/github-app/success`;

    // Construct GitHub App installation URL
    const installUrl = new URL(
      `https://github.com/apps/${appName.trim()}/installations/new`,
    );
    installUrl.searchParams.set("state", encodeURIComponent(callbackUrl));

    return {
      success: true,
      url: installUrl.toString(),
    };
  } catch (error) {
    console.error("Error building installation URL:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : INSTALLATION_ERRORS.UNKNOWN.message,
      errorCode: INSTALLATION_ERRORS.UNKNOWN.code,
    };
  }
}

/**
 * Get user-friendly error information
 */
export function getInstallationError(errorCode: string): InstallationError {
  const errorKey = errorCode as keyof typeof INSTALLATION_ERRORS;
  return INSTALLATION_ERRORS[errorKey] || INSTALLATION_ERRORS.UNKNOWN;
}

/**
 * Validate GitHub App configuration
 */
export function validateGitHubAppConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    !env.NEXT_PUBLIC_GITHUB_APP_NAME ||
    env.NEXT_PUBLIC_GITHUB_APP_NAME.trim() === ""
  ) {
    errors.push("NEXT_PUBLIC_GITHUB_APP_NAME is not configured");
  }

  if (!env.NEXT_PUBLIC_GITHUB_APP_ID) {
    errors.push("NEXT_PUBLIC_GITHUB_APP_ID is not configured");
  }

  if (!env.GITHUB_APP_PRIVATE_KEY) {
    errors.push("GITHUB_APP_PRIVATE_KEY is not configured");
  }

  if (!env.GITHUB_APP_WEBHOOK_SECRET) {
    errors.push("GITHUB_APP_WEBHOOK_SECRET is not configured");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get installation status for user feedback
 */
export function getInstallationStatus(searchParams: URLSearchParams) {
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return {
      success: false,
      error: error,
      errorDescription: errorDescription || "Installation failed",
      installationId,
    };
  }

  if (installationId) {
    return {
      success: true,
      installationId,
      setupAction: setupAction || "install",
    };
  }

  return {
    success: false,
    error: "missing_installation_id",
    errorDescription:
      "Installation completed but no installation ID was provided",
  };
}
