"use client";

import { getInstallationStatus } from "@/lib/github-app-utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { SuccessState } from "./success-state";
import { UnknownStatus } from "./unknown-status";

export function InstallationStatusHandler() {
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

        if (!data.starred) {
          router.push("/github-app/limbo");
        }
      } catch (error) {
        console.error("Failed to check star status:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const status = getInstallationStatus(searchParams);
    setInstallationStatus(status);

    if (status.success && status.installationId) {
      performStarCheck(status.installationId);
    } else {
      setIsLoading(false);
    }
  }, [searchParams, performStarCheck]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!installationStatus) {
    return <UnknownStatus />;
  }

  if (!installationStatus.success) {
    return <ErrorState installationStatus={installationStatus} />;
  }

  return <SuccessState installationStatus={installationStatus} />;
}
