"use client";

import { InstallationStatusHandler } from "@/components/success";
import { PageLoading } from "@/components/ui/page-loading";
import { Suspense } from "react";

function SuccessContent() {
  return <InstallationStatusHandler />;
}

export default function GitHubAppSuccessPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading installation status..." />}>
      <SuccessContent />
    </Suspense>
  );
}
