"use client";

import { getInstallationStatus } from "@/lib/github-app-utils";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { SuccessState } from "./success-state";
import { UnknownStatus } from "./unknown-status";

export function InstallationStatusHandler() {
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

  if (isLoading) {
    return <LoadingState />;
  }

  if (!installationStatus) {
    return <UnknownStatus />;
  }

  // Handle error states
  if (!installationStatus.success) {
    return <ErrorState installationStatus={installationStatus} />;
  }

  // Success state
  return <SuccessState installationStatus={installationStatus} />;
}
