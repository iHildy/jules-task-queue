import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  if (!env.GITHUB_APP_NAME) {
    console.error("GITHUB_APP_NAME environment variable is not set.");
    return NextResponse.json(
      { error: "GitHub App configuration error." },
      { status: 500 },
    );
  }

  // Construct the GitHub App installation URL
  // Users will be redirected here to install the app on their chosen repositories.
  // GitHub will then redirect them to the "Setup URL" or "Callback URL" configured in the app settings.
  const appNameSlug = env.GITHUB_APP_NAME.toLowerCase().replace(/\s+/g, "-");
  const installUrl = `https://github.com/apps/${appNameSlug}/installations/new`;

  // It's also possible to redirect to a specific repository if known:
  // const installUrlForRepo = `https://github.com/apps/${appNameSlug}/installations/new/permissions?target_id=YOUR_REPO_ID`;

  // Or suggest a repository (user can change it)
  // const suggestedRepoFullName = "owner/repo"; // Example
  // const installUrlWithSuggestion = `https://github.com/apps/${appNameSlug}/installations/new?suggested_target_id=USER_OR_ORG_ID&repository_ids[]=REPO_ID_IF_KNOWN`;

  // For a general installation link:
  return NextResponse.redirect(installUrl);
}
