import { NextRequest, NextResponse } from "next/server";

// This endpoint is deprecated - GitHub App webhooks should use /api/webhooks/github-app
// Redirecting all requests to the new endpoint

/**
 * Redirect to GitHub App webhook handler
 */
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      error: "This webhook endpoint is deprecated",
      message: "Please use /api/webhooks/github-app for GitHub App webhooks",
      redirect: "/api/webhooks/github-app"
    },
    { status: 410 } // Gone
  );
}

/**
 * Health check redirect
 */
export async function GET() {
  return NextResponse.json({
    status: "deprecated",
    service: "GitHub webhook handler (deprecated)",
    message: "Use /api/webhooks/github-app instead",
    redirect: "/api/webhooks/github-app"
  });
}
