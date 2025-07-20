import { encrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const installationId = searchParams.get("installation_id");

  if (!code || !installationId) {
    return NextResponse.json(
      { error: "Missing code or installation_id" },
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

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
    const refreshTokenExpiresAt = new Date(
      Date.now() + refresh_token_expires_in * 1000,
    );

    await db.gitHubInstallation.update({
      where: { id: Number(installationId) },
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
