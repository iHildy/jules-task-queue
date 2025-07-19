import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { AlertCircle, Home } from "lucide-react";
import Link from "next/link";

interface ErrorStateProps {
  installationStatus: {
    success: boolean;
    error?: string;
    errorDescription?: string;
  };
}

export function ErrorState({ installationStatus }: ErrorStateProps) {
  const handleRetryInstallation = () => {
    window.location.href = "/api/github-app/install";
  };

  const handleContactSupport = () => {
    window.open("https://github.com/iHildy/jules-task-queue/issues", "_blank");
  };

  const isPermissionError = installationStatus.error === "access_denied";
  const isConfigError = installationStatus.error === "configuration_error";
  const isMissingPermission = installationStatus.error === "missing_permission";
  const isStarCheckFailed = installationStatus.error === "star_check_failed";
  const isInstallationInvalid =
    installationStatus.error === "installation_invalid";

  return (
    <div className="min-h-screen bg-jules-dark">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/10 border border-red-500/80 mb-6">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Installation Failed
          </h1>
          <p className="text-lg sm:text-xl text-jules-gray max-w-2xl mx-auto">
            {installationStatus.errorDescription ||
              "The GitHub App installation could not be completed."}
          </p>
        </div>

        {/* What went wrong? */}
        <Card className="mb-8 bg-red-600/10 border-red-500/20">
          <CardContent className="p-6">
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
            ) : isMissingPermission ? (
              <div className="space-y-3 text-jules-gray">
                <p>
                  The GitHub App is missing required permissions to
                  automatically star repositories.
                </p>
                <p>
                  <strong className="text-white">To fix this:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>
                    The app administrator needs to update the GitHub App
                    permissions
                  </li>
                  <li>
                    Add &quot;Starring&quot; user permission with &quot;Read and
                    write&quot; access
                  </li>
                  <li>Reinstall the app after updating permissions</li>
                </ul>
              </div>
            ) : isStarCheckFailed ? (
              <div className="space-y-3 text-jules-gray">
                <p>There was an issue verifying the repository star status.</p>
                <p>
                  <strong className="text-white">Please try:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Refreshing the page and trying again</li>
                  <li>Manually starring the repository if required</li>
                  <li>Contacting support if the issue persists</li>
                </ul>
              </div>
            ) : isInstallationInvalid ? (
              <div className="space-y-3 text-jules-gray">
                <p>
                  The GitHub App installation is no longer valid. This usually
                  happens when the app was uninstalled and reinstalled.
                </p>
                <p>
                  <strong className="text-white">To fix this issue:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Go back to the homepage</li>
                  <li>Click &quot;Connect to GitHub&quot; again</li>
                  <li>
                    Complete the installation process with the new installation
                  </li>
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
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-center items-center gap-4 mb-8">
          <Button
            onClick={handleRetryInstallation}
            size="lg"
            className="w-full sm:w-auto bg-white text-jules-dark hover:bg-white/90"
          >
            <SiGithub className="w-4 h-4 mr-2" />
            Try Installation Again
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-jules-primary text-jules-primary cursor-pointer"
          >
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="text-center text-sm text-jules-gray/60">
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
