import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  CheckCircle,
  ExternalLink,
  Home,
  Info,
  Settings2,
  Tag,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { SuccessStateProps } from "@/types/components";

export function SuccessState({
  installationStatus,
}: SuccessStateProps): React.JSX.Element {
  const searchParams = useSearchParams();

  // Get label setup results from URL params
  const setupType = searchParams.get("setup_type");
  const repositoriesProcessed = searchParams.get("repositories_processed");
  const labelsSuccessful = searchParams.get("labels_successful");
  const labelsFailed = searchParams.get("labels_failed");

  const handleViewInstallations = () => {
    window.open("https://github.com/settings/installations", "_blank");
  };

  const handleContactSupport = () => {
    window.open("https://github.com/ihildy/jules-task-queue/issues", "_blank");
  };

  // Render label setup results if available
  const renderLabelSetupResults = () => {
    if (!setupType) return null;

    if (setupType === "manual") {
      return (
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Tag className="w-5 h-5 mr-2 text-blue-400" />
            Manual Label Setup Selected
          </h3>
          <p className="text-gray-300">
            You chose to set up Jules labels manually. Remember to create the{" "}
            <code className="bg-jules-primary/20 px-2 py-1 rounded text-jules-secondary">
              &quot;jules&quot;
            </code>{" "}
            and{" "}
            <code className="bg-jules-primary/20 px-2 py-1 rounded text-jules-secondary">
              &quot;jules-queue&quot;
            </code>{" "}
            labels in repositories where you want to use Jules Task Queue.
          </p>
        </div>
      );
    }

    const totalProcessed = repositoriesProcessed
      ? parseInt(repositoriesProcessed)
      : 0;
    const successful = labelsSuccessful ? parseInt(labelsSuccessful) : 0;
    const failed = labelsFailed ? parseInt(labelsFailed) : 0;

    return (
      <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
          Labels Setup Complete
        </h3>
        <div className="text-gray-300">
          <p className="mb-2">
            Jules labels are now ready in{" "}
            <span className="text-white font-semibold">
              {setupType === "all" ? "all" : "selected"}
            </span>{" "}
            repositories.
          </p>
          {totalProcessed > 0 && (
            <div className="text-sm text-gray-400">
              • {totalProcessed} repositories processed
              {successful > 0 && <span> • {successful} labels configured</span>}
              {failed > 0 && (
                <span className="text-yellow-400"> • {failed} had issues</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-jules-dark">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/10 border border-green-500/80 mb-6">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Installation Successful
          </h1>
          <p className="text-lg sm:text-xl text-jules-gray max-w-2xl mx-auto">
            Welcome to Jules Task Queue! Your GitHub App is ready to go.
          </p>
        </div>

        {renderLabelSetupResults()}

        {/* What happens next? */}
        <Card className="mb-8 bg-jules-primary/10 border-jules-primary/20">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-jules-secondary" />
              What happens next?
            </h3>
            <ul className="space-y-3 text-jules-gray">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-white">
                    Automatic webhook setup:
                  </strong>{" "}
                  We&apos;ve configured webhooks to monitor your repository for
                  Jules label events.
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-white">
                    Smart queue management:
                  </strong>{" "}
                  When you add the &quot;jules&quot; label to an issue,
                  we&apos;ll automatically queue it and manage the 5-task limit.
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-white">
                    Intelligent processing:
                  </strong>{" "}
                  We analyze Jules responses and automatically retry tasks when
                  slots become available.
                </span>
              </li>
              <li className="flex items-start">
                <Info className="w-5 h-5 mr-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-white">
                    Use the &quot;human&quot; label to manually intervene
                  </strong>{" "}
                  You can use the &quot;human&quot; label to manually intervene
                  in the queue. See the{" "}
                  <Link
                    href="https://github.com/ihildy/jules-task-queue/blob/0bd3272f9158e6ef3bc59dfb0a7df507803dbc2b/jules-queueing-system.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-jules-secondary hover:underline cursor-pointer"
                  >
                    documentation
                  </Link>{" "}
                  for more information.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Ready to use */}
        <Card className="mb-8 bg-jules-primary/5 border-jules-primary/10">
          <CardContent className="p-6">
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
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-center items-center gap-4 mb-8">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto bg-white text-jules-dark hover:bg-white/90"
          >
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-jules-secondary text-jules-secondary cursor-pointer"
          >
            <Link
              href="https://github.com/ihildy/jules-task-queue"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SiGithub className="w-4 h-4 mr-2" />
              View Repository
            </Link>
          </Button>

          <Button
            onClick={handleViewInstallations}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-jules-primary text-jules-primary cursor-pointer"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Manage Installation
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {installationStatus.installationId && (
          <div className="text-center text-sm text-jules-gray/60">
            Installation ID: {installationStatus.installationId}
            {installationStatus.setupAction &&
              ` • Setup: ${installationStatus.setupAction}`}
          </div>
        )}

        <div className="mt-12 text-center text-sm text-jules-gray/60">
          <p>
            Need help? Check out our{" "}
            <a
              href="https://github.com/ihildy/jules-task-queue"
              target="_blank"
              rel="noopener noreferrer"
              className="text-jules-secondary hover:underline cursor-pointer"
            >
              documentation
            </a>{" "}
            or{" "}
            <button
              onClick={handleContactSupport}
              className="text-jules-secondary hover:underline cursor-pointer"
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
