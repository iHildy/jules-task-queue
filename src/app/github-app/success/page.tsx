"use client";

import { InstallationStatusHandler } from "@/components/success";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Suspense } from "react";

function SuccessContent() {
  return <InstallationStatusHandler />;
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
