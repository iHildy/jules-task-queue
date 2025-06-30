import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Redirect to GitHub App installation
 */
export async function GET(req: NextRequest) {
  try {
    // Get the base URL for callback
    const baseUrl = new URL(req.url).origin;
    const callbackUrl = `${baseUrl}/github-app/success`;
    
    // Construct GitHub App installation URL using configured app name
    const appName = env.GITHUB_APP_NAME || 'jules-task-queue';
    const installUrl = new URL(`https://github.com/apps/${appName}/installations/new`);
    installUrl.searchParams.set('state', encodeURIComponent(callbackUrl));
    
    // Redirect to GitHub App installation
    return NextResponse.redirect(installUrl.toString());
  } catch (error) {
    console.error('Error redirecting to GitHub App installation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to redirect to GitHub App installation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}