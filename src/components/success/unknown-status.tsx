import { Button } from "@/components/ui/button";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Home } from "lucide-react";
import Link from "next/link";

export function UnknownStatus() {
  const handleRetryInstallation = () => {
    window.location.href = "/api/github-app/install";
  };

  const handleContactSupport = () => {
    window.open("https://github.com/ihildy/jules-task-queue/issues", "_blank");
  };

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
