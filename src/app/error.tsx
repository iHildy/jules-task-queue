"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-jules-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Oops! Something went wrong
          </h1>
          <p className="text-jules-gray">
            We encountered an error while loading this page. Please try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-jules-primary hover:bg-jules-secondary text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="border-jules-gray/30 text-white bg-jules-gray/10 hover:bg-jules-gray/20 hover:text-white"
          >
            <Home className="h-4 w-4 mr-2" />
            Go home
          </Button>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-jules-gray hover:text-white">
              Error details (development only)
            </summary>
            <pre className="mt-2 text-xs text-red-400 bg-black/20 p-3 rounded border overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
