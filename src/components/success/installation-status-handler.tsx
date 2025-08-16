"use client";

import { getInstallationStatus } from "@/lib/github-app-utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import React from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { SuccessState } from "./success-state";
import { UnknownStatus } from "./unknown-status";

// URL validation function to prevent malicious redirects
function isValidOAuthUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS URLs
    if (parsedUrl.protocol !== "https:") {
      return false;
    }

    // Only allow same origin or trusted GitHub domains
    const allowedDomains = [
      "github.com",
      "githubusercontent.com",
      window.location.hostname, // Same origin
    ];

    if (
      !allowedDomains.some(
        (domain) =>
          parsedUrl.hostname === domain ||
          parsedUrl.hostname.endsWith(`.${domain}`),
      )
    ) {
      return false;
    }

    // Ensure the path is for OAuth authorization
    if (!parsedUrl.pathname.includes("/api/auth/authorize/github")) {
      return false;
    }

    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

export function InstallationStatusHandler(): React.JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [installationStatus, setInstallationStatus] = useState<{
    success: boolean;
    installationId?: string | null;
    setupAction?: string;
    error?: string;
    errorDescription?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const performStarCheck = useCallback(
    async (installationId: string) => {
      try {
        const isEnabledResponse = await fetch(
          "/api/github-app/star-check/is-enabled",
        );
        const { isEnabled } = await isEnabledResponse.json();

        if (!isEnabled) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(
          `/api/github-app/star-check?installation_id=${installationId}`,
        );
        const data = await response.json();

        if (!response.ok) {
          // Handle API errors gracefully
          if (response.status === 401 && data.error === "oauth_required") {
            console.log("OAuth flow required, redirecting user");

            // Validate OAuth URL before redirecting
            if (data.oauth_url && isValidOAuthUrl(data.oauth_url)) {
              window.location.href = data.oauth_url;
            } else {
              console.error("Invalid OAuth URL received:", data.oauth_url);
              setInstallationStatus({
                success: false,
                error: "invalid_oauth_url",
                errorDescription: "Invalid OAuth URL received from server",
              });
              setIsLoading(false);
            }
            return;
          }

          if (response.status === 403) {
            console.error(
              "GitHub App missing 'Starring' permission:",
              data.message,
            );
            setInstallationStatus({
              success: false,
              error: "missing_permission",
              errorDescription: data.message || "Missing starring permission",
            });
            setIsLoading(false);
            return;
          }

          if (response.status === 404) {
            console.error(
              "Installation or repository not found:",
              data.message,
            );
            if (data.error === "Installation not found") {
              setInstallationStatus({
                success: false,
                error: "installation_invalid",
                errorDescription:
                  data.message || "Installation is no longer valid",
              });
            } else {
              setInstallationStatus({
                success: false,
                error: "configuration_error",
                errorDescription:
                  data.message || "Repository configuration error",
              });
            }
            setIsLoading(false);
            return;
          }

          if (response.status === 500) {
            console.error("Star check configuration error:", data.message);
            setInstallationStatus({
              success: false,
              error: "configuration_error",
              errorDescription: data.message || "Server configuration error",
            });
            setIsLoading(false);
            return;
          }

          // Generic error handling
          console.error("Star check failed:", data.message);
          setInstallationStatus({
            success: false,
            error: "star_check_failed",
            errorDescription:
              data.message || "Failed to verify repository star",
          });
          setIsLoading(false);
          return;
        }

        if (!data.starred) {
          setIsRedirecting(true);
          router.push(`/github-app/limbo?installation_id=${installationId}`);
        } else {
          // Star check passed, redirect to label setup
          setIsRedirecting(true);
          router.push(
            `/github-app/label-setup?installation_id=${installationId}`,
          );
        }
      } catch (error) {
        console.error("Failed to check star status:", error);
        setInstallationStatus({
          success: false,
          error: "network_error",
          errorDescription: "Unable to check star status. Please try again.",
          installationId,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const status = getInstallationStatus(searchParams);
    setInstallationStatus(status);

    // Check if this is a redirect from label setup completion
    const setupType = searchParams.get("setup_type");

    if (setupType) {
      // User is coming from successful label setup, show success directly
      setInstallationStatus({
        success: true,
        installationId: status.installationId,
        setupAction: "label_setup_complete",
      });
      setIsLoading(false);
    } else if (status.success && status.installationId) {
      // This is initial installation, proceed with star check
      performStarCheck(status.installationId);
    } else {
      setIsLoading(false);
    }
  }, [searchParams, performStarCheck]);

  if (isLoading || isRedirecting) {
    return <LoadingState />;
  }

  if (!installationStatus) {
    return <UnknownStatus />;
  }

  if (!installationStatus.success) {
    return <ErrorState installationStatus={installationStatus} />;
  }

  return (
    <ErrorBoundary>
      <SuccessState installationStatus={installationStatus} />
    </ErrorBoundary>
  );
}
