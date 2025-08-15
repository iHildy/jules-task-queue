"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorDisplay } from "@/components/ui/error-display";
import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  buildInstallationUrl,
  getInstallationError,
} from "@/lib/github-app-utils";
import type { GitHubInstallButtonProps } from "@/types/components";

export function GitHubInstallButton({
  onInstallStart,
  onInstallError,
  className,
  children = "Link GitHub Repository",
}: GitHubInstallButtonProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  const handleInstall = async () => {
    setIsLoading(true);
    setError(null);

    try {
      onInstallStart?.();

      // Get current URL for callback
      const currentUrl = window.location.href;

      // Build installation URL using shared utility
      const result = buildInstallationUrl(currentUrl);

      if (!result.success) {
        const errorInfo = getInstallationError(result.errorCode || "UNKNOWN");
        setError({
          code: result.errorCode || "UNKNOWN",
          message: errorInfo.userMessage,
        });
        onInstallError?.(result.error || "Installation failed");
        return;
      }

      // Redirect to GitHub App installation
      window.location.href = result.url!;
    } catch (err) {
      console.error("Installation error:", err);
      const errorInfo = getInstallationError("UNKNOWN");
      setError({
        code: "UNKNOWN",
        message: errorInfo.userMessage,
      });
      onInstallError?.(
        err instanceof Error ? err.message : "Installation failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleInstall();
  };

  const handleContactSupport = () => {
    window.open("https://github.com/ihildy/jules-task-queue/issues", "_blank");
  };

  if (error) {
    const errorInfo = getInstallationError(error.code);
    return (
      <ErrorDisplay
        title="Installation Failed"
        message={error.message}
        suggestedAction={errorInfo.suggestedAction}
        onRetry={handleRetry}
        onContactSupport={handleContactSupport}
        className="max-w-md mx-auto"
      />
    );
  }

  return (
    <Button
      size="lg"
      onClick={handleInstall}
      disabled={isLoading}
      className={
        className ||
        "bg-white text-jules-dark cursor-pointer hover:bg-white/90 ring-2 ring-transparent hover:ring-jules-primary font-semibold"
      }
    >
      {isLoading ? (
        <LoadingSpinner size="sm" text="Connecting to GitHub..." />
      ) : (
        <>
          <SiGithub className="w-4 h-4 mr-2" />
          {children}
        </>
      )}
    </Button>
  );
}

export default GitHubInstallButton;
