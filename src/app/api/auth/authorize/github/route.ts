import { env } from "@/lib/env";
import logger from "@/lib/logger";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Safe redirect URLs - only allow internal paths or whitelisted domains
const SAFE_REDIRECT_PATTERNS = [
  /^\/github-app\/success$/, // Internal success page
  /^\/github-app\/label-setup$/, // Internal label setup page
  /^\/$/, // Home page
];

function isValidRedirectUrl(redirectTo: string): boolean {
  // Check if it's a relative URL (starts with /)
  if (redirectTo.startsWith("/")) {
    return SAFE_REDIRECT_PATTERNS.some((pattern) => pattern.test(redirectTo));
  }

  // For absolute URLs, only allow same origin
  try {
    const redirectUrl = new URL(redirectTo);
    const baseUrl = new URL(env.GITHUB_APP_CALLBACK_URL);
    return redirectUrl.origin === baseUrl.origin;
  } catch {
    // Invalid URL format
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const redirectTo = searchParams.get("redirect_to") || "/github-app/success";

  if (!installationId) {
    return NextResponse.json(
      { error: "Installation ID is required" },
      { status: 400 },
    );
  }

  // Validate redirectTo to prevent open redirect vulnerabilities
  if (!isValidRedirectUrl(redirectTo)) {
    logger.warn(
      { installationId, redirectTo },
      "Invalid redirect URL attempted in OAuth flow",
    );
    return NextResponse.json(
      { error: "Invalid redirect URL" },
      { status: 400 },
    );
  }

  try {
    // Generate CSRF state and encode installation_id and redirectTo using base64
    const state = crypto.randomBytes(32).toString("hex");
    const stateData = {
      state,
      installationId,
      redirectTo,
    };
    const stateWithInstallation = Buffer.from(
      JSON.stringify(stateData),
    ).toString("base64");

    // Set CSRF state cookie
    const cookieStore = await cookies();
    cookieStore.set("oauth_state", stateWithInstallation, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });

    // Build GitHub OAuth authorization URL
    const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
    githubAuthUrl.searchParams.set("client_id", env.GITHUB_APP_CLIENT_ID);
    githubAuthUrl.searchParams.set("redirect_uri", env.GITHUB_APP_CALLBACK_URL);
    githubAuthUrl.searchParams.set("state", stateWithInstallation);
    githubAuthUrl.searchParams.set("scope", "repo"); // Add required scopes

    logger.info(
      { installationId, redirectTo },
      "Redirecting to GitHub OAuth authorization",
    );

    return NextResponse.redirect(githubAuthUrl.toString());
  } catch (error) {
    logger.error({ error }, "Failed to create OAuth authorization URL");
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 },
    );
  }
}
