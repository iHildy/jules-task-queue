"use client";

import { LabelSetupHandler } from "@/components/label-setup";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Suspense } from "react";

function LabelSetupContent() {
  return <LabelSetupHandler />;
}

export default function GitHubAppLabelSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-jules-dark flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading repositories..." />
        </div>
      }
    >
      <LabelSetupContent />
    </Suspense>
  );
}
