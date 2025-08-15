"use client";

import React from "react";
import { ErrorDisplay } from "@/components/ui/error-display";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;

      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <ErrorDisplay
          title="Something went wrong"
          message={
            this.state.error?.message ||
            "An unexpected error occurred. Please try again."
          }
          suggestedAction="Refresh the page or contact support if the problem persists."
          onRetry={this.handleRetry}
          onContactSupport={() =>
            window.open(
              "https://github.com/ihildy/jules-task-queue/issues",
              "_blank",
            )
          }
          retryLabel="Try Again"
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
