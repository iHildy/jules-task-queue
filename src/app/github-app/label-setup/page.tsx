"use client";

import { LabelSetupHandler } from "@/components/label-setup";
import { PageLoading } from "@/components/ui/page-loading";
import { Suspense } from "react";

function LabelSetupContent() {
  return <LabelSetupHandler />;
}

export default function GitHubAppLabelSetupPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading repositories..." />}>
      <LabelSetupContent />
    </Suspense>
  );
}
