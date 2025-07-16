"use client";

import { getInstallationStatus } from "@/lib/github-app-utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [starCheck, setStarCheck] = useState(false);

  useEffect(() => {
    const status = getInstallationStatus(searchParams);
    setInstallationStatus(status);

    if (status.success && status.installationId && !starCheck) {
      const checkStar = async () => {
        try {
          const response = await fetch(
            `/api/github-app/star-check?installation_id=${status.installationId}`,
          );
          const data = await response.json();

          if (!data.starred) {
            router.push("/github-app/limbo");
          }
        } catch (error) {
          console.error("Failed to check star status:", error);
          // Optional: handle error state
        } finally {
          setIsLoading(false);
          setStarCheck(true);
        }
      };

      checkStar();
    } else {
      setIsLoading(false);
    }
  }, [searchParams, router, starCheck]);

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
