"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorDisplay } from "@/components/ui/error-display";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getInstallationStatus } from "@/lib/github-app-utils";
import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Home,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const [installationStatus, setInstallationStatus] = useState<{
    success: boolean;
    installationId?: string | null;
    setupAction?: string;
    error?: string;
    errorDescription?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Process URL parameters and determine installation status
    const status = getInstallationStatus(searchParams);
    setInstallationStatus(status);
    setIsLoading(false);
  }, [searchParams]);

  const handleRetryInstallation = () => {
    window.location.href = "/api/github-app/install";
  };

  const handleContactSupport = () => {
    window.open("https://github.com/iHildy/jules-task-queue/issues", "_blank");
  };

  const handleViewInstallations = () => {
    window.open("https://github.com/settings/installations", "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-jules-dark flex items-center justify-center px-4">
        <LoadingSpinner size="lg" text="Processing installation..." />
      </div>
    );
  }

  if (!installationStatus) {
    return (
      <div className="min-h-screen bg-jules-dark flex items-center justify-center px-4">
        <div className="relative max-w-2xl mx-auto text-center">
          <ErrorDisplay
            title="Installation Status Unknown"
            message="Unable to determine the installation status. This might be due to missing parameters."
            suggestedAction="Try installing the GitHub App again from the main page."
            onRetry={handleRetryInstallation}
            onContactSupport={handleContactSupport}
          />

          <div className="mt-6">
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle error states
  if (!installationStatus.success) {
    const isPermissionError = installationStatus.error === "access_denied";
    const isConfigError = installationStatus.error === "configuration_error";

    return (
      <div className="min-h-screen bg-jules-dark flex items-center justify-center px-4">
        <div className="relative max-w-4xl mx-auto text-center">
          <Badge
            variant="outline"
            className="mb-8 border-2 bg-red-600/10 border-red-500/80 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Installation Failed
          </Badge>

          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-red-600/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
              <span className="text-white">Installation</span>
              <br />
              <span className="text-red-400">Incomplete</span>
            </h1>

            <p className="text-xl md:text-2xl mb-6 max-w-3xl mx-auto leading-relaxed text-jules-gray">
              {installationStatus.errorDescription ||
                "The GitHub App installation could not be completed."}
            </p>
          </div>

          <div className="bg-red-600/10 border border-red-500/20 rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
              What went wrong?
            </h3>

            {isPermissionError ? (
              <div className="space-y-3 text-jules-gray">
                <p>
                  You cancelled the installation or don&apos;t have permission
                  to install apps on the selected repository.
                </p>
                <p>
                  <strong className="text-white">
                    To complete the installation:
                  </strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>
                    Make sure you&apos;re the repository owner or have admin
                    permissions
                  </li>
                  <li>Try the installation process again</li>
                  <li>Contact the repository owner if you need permissions</li>
                </ul>
              </div>
            ) : isConfigError ? (
              <div className="space-y-3 text-jules-gray">
                <p>There&apos;s a configuration issue with the GitHub App.</p>
                <p>
                  <strong className="text-white">Please try:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Refreshing the page and trying again</li>
                  <li>Contacting support if the issue persists</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3 text-jules-gray">
                <p>An unexpected error occurred during installation.</p>
                <p>
                  <strong className="text-white">Error details:</strong>{" "}
                  {installationStatus.error}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
            <Button
              onClick={handleRetryInstallation}
              size="lg"
              className="bg-white text-jules-dark hover:bg-white/90"
            >
              <SiGithub className="w-4 h-4 mr-2" />
              Try Installation Again
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-jules-primary text-jules-primary hover:bg-jules-primary/10"
            >
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>

          <div className="text-sm text-jules-gray/60">
            <p>
              Need help? Check out our{" "}
              <a
                href="https://github.com/iHildy/jules-task-queue"
                target="_blank"
                rel="noopener noreferrer"
                className="text-jules-secondary hover:underline"
              >
                documentation
              </a>{" "}
              or{" "}
              <button
                onClick={handleContactSupport}
                className="text-jules-secondary hover:underline"
              >
                contact support
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-jules-dark flex items-center justify-center px-4">
      <div className="relative max-w-4xl mx-auto text-center">
        <Badge
          variant="outline"
          className="mb-8 border-2 bg-green-600/10 border-green-500/80 text-green-400 text-sm"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Installation Successful
        </Badge>

        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-green-600/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
            <span className="text-white">Welcome to</span>
            <br />
            <span className="text-jules-secondary">Jules Task Queue!</span>
          </h1>

          <p className="text-xl md:text-2xl mb-6 max-w-3xl mx-auto leading-relaxed text-jules-gray">
            Your GitHub App has been successfully installed. Jules Task Queue
            will now automatically manage your task queue.
          </p>
        </div>

        <div className="bg-jules-primary/10 border border-jules-primary/20 rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-jules-secondary" />
            What happens next?
          </h3>
          <ul className="space-y-3 text-jules-gray">
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 mr-3 text-green-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Automatic webhook setup:</strong>{" "}
                We&apos;ve configured webhooks to monitor your repository for
                Jules label events.
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 mr-3 text-green-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Smart queue management:</strong>{" "}
                When you add the &quot;jules&quot; label to an issue, we&apos;ll
                automatically queue it and manage the 5-task limit.
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 mr-3 text-green-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Intelligent processing:</strong>{" "}
                We analyze Jules bot responses and automatically retry tasks
                when slots become available.
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-jules-primary/5 border border-jules-primary/10 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-3">
            🚀 Ready to use your full 60 tasks per day?
          </h3>
          <p className="text-jules-gray mb-4">
            Simply add the{" "}
            <code className="bg-jules-primary/20 px-2 py-1 rounded text-jules-secondary">
              &quot;jules&quot;
            </code>{" "}
            label to any issue where you want Jules to help, and we&apos;ll
            handle the queue management automatically.
          </p>
          <p className="text-sm text-jules-gray">
            No more manual retries or waiting for task slots to free up!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
          <Button
            asChild
            size="lg"
            className="bg-white text-jules-dark hover:bg-white/90"
          >
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          <Button
            onClick={handleViewInstallations}
            size="lg"
            variant="outline"
            className="border-jules-primary text-jules-primary hover:bg-jules-primary/10"
          >
            <SiGithub className="w-4 h-4 mr-2" />
            Manage Installation
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {installationStatus.installationId && (
          <div className="text-sm text-jules-gray/60">
            Installation ID: {installationStatus.installationId}
            {installationStatus.setupAction &&
              ` • Setup: ${installationStatus.setupAction}`}
          </div>
        )}

        <div className="mt-12 text-sm text-jules-gray/60">
          <p>
            Need help? Check out our{" "}
            <a
              href="https://github.com/iHildy/jules-task-queue"
              target="_blank"
              rel="noopener noreferrer"
              className="text-jules-secondary hover:underline"
            >
              documentation
            </a>{" "}
            or{" "}
            <button
              onClick={handleContactSupport}
              className="text-jules-secondary hover:underline"
            >
              contact support
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GitHubAppSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-jules-dark flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
