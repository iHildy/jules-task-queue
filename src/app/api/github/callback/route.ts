import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  console.log(
    `GitHub App callback received: installation_id=${installationId}, setup_action=${setupAction}`,
  );

  if (setupAction === "install" && installationId) {
    // An app was installed.
    // For a multi-tenant app, you would typically save this installationId associated with the user/org.
    // For a single-tenant self-hosted app, this installation_id could potentially be stored
    // if you want to use a specific GITHUB_APP_INSTALLATION_ID that's discovered post-install.
    // However, for many operations, the installation_id will come from webhook payloads.
    console.log(`GitHub App successfully installed with ID: ${installationId}`);
  } else if (setupAction === "update" && installationId) {
    // Configuration was updated for an existing installation.
    console.log(
      `GitHub App installation ID ${installationId} was updated (e.g., repository access changed).`,
    );
  } else {
    console.log(
      "GitHub App callback received without specific setup_action or installation_id.",
    );
  }

  // Redirect to a success page within your application
  const successUrl = new URL("/success", env.NEXT_PUBLIC_APP_URL);
  return NextResponse.redirect(successUrl.toString());
}
