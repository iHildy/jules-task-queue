"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-loading";
import { ExternalLink, Home, RefreshCw, Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { toast } from "sonner";

function LimboPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(false);

  const installationId = searchParams.get("installation_id");

  const handleRecheck = useCallback(async () => {
    if (!installationId) {
      toast.error("Missing installation ID. Please try reinstalling the app.");
      router.push("/");
      return;
    }

    setIsChecking(true);

    try {
      // Check if star requirement is enabled
      const isEnabledResponse = await fetch(
        "/api/github-app/star-check/is-enabled",
      );
      const { isEnabled } = await isEnabledResponse.json();

      if (!isEnabled) {
        // Star requirement is disabled, go to success
        router.push(
          `/github-app/success?installation_id=${installationId}&setup_action=install`,
        );
        return;
      }

      // Check star status
      const response = await fetch(
        `/api/github-app/star-check?installation_id=${installationId}`,
      );
      const data = await response.json();

      if (response.ok && data.starred) {
        // User has starred the repo, redirect to success
        toast.success("Repository starred! Redirecting to success page...");
        setTimeout(() => {
          router.push(
            `/github-app/success?installation_id=${installationId}&setup_action=install`,
          );
        }, 1500);
      } else {
        // User hasn't starred yet, show toast and stay on limbo page
        toast.error(
          "Repository not starred yet. Please star the repository and try again.",
        );
        setIsChecking(false);
      }
    } catch (error) {
      console.error("Error checking star status:", error);
      toast.error("Failed to check star status. Please try again.");
      setIsChecking(false);
    }
  }, [installationId, router]);

  return (
    <div className="min-h-screen bg-jules-dark">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-6">
            <Star className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Almost There!
          </h1>
          <p className="text-lg sm:text-xl text-jules-gray max-w-2xl mx-auto">
            Please star the repository to complete the setup
          </p>
        </div>

        {/* Why Star Section */}
        <Card className="mb-8 bg-jules-darker border-jules-gray/20">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-3">
              Why do we ask for a star?
            </h2>
            <p className="text-jules-gray leading-relaxed">
              When using the hosted version of Jules Task Queue we ask that you
              star the repository as a simple and free way to show your support
              for the project.
            </p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
          <Button
            asChild
            size="lg"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3"
          >
            <a
              href="https://github.com/ihildy/jules-task-queue"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <Star className="h-5 w-5" />
              Star the Repository
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>

          <Button
            onClick={handleRecheck}
            disabled={isChecking}
            variant="outline"
            size="lg"
            className="w-full border-jules-gray/30 text-white bg-jules-gray/10 hover:bg-jules-gray/20 hover:text-white font-semibold py-3"
          >
            {isChecking ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 mr-2" />
                I&apos;ve starred it, continue!
              </>
            )}
          </Button>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="w-full sm:w-auto text-jules-gray hover:text-white hover:bg-jules-gray/10"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-12 pt-6 border-t border-jules-gray/20 text-center">
          <p className="text-sm text-jules-gray">
            If you&apos;d like to avoid the star requirement, you can self-host
            the app by following the instructions in the{" "}
            <a
              href="https://github.com/ihildy/jules-task-queue/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-jules-accent hover:underline"
            >
              Documentation
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LimboPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading..." />}>
      <LimboPageContent />
    </Suspense>
  );
}
