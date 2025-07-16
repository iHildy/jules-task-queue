import { Badge } from "@/components/ui/badge";
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
                You cancelled the installation or don&apos;t have permission to
                install apps on the selected repository.
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
            className="border-jules-primary text-jules-primary cursor-pointer"
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
