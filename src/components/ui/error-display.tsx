import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";

interface ErrorDisplayProps {
  title?: string;
  message: string;
  suggestedAction?: string;
  onRetry?: () => void;
  onContactSupport?: () => void;
  retryLabel?: string;
  className?: string;
  variant?: "default" | "destructive";
}

export function ErrorDisplay({
  title = "Something went wrong",
  message,
  suggestedAction,
  onRetry,
  onContactSupport,
  retryLabel = "Try Again",
  className,
  variant = "destructive",
}: ErrorDisplayProps) {
  return (
    <Alert variant={variant} className={cn("", className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>

        {suggestedAction && (
          <p className="text-sm text-muted-foreground">
            <strong>Suggestion:</strong> {suggestedAction}
          </p>
        )}

        {(onRetry || onContactSupport) && (
          <div className="flex gap-2 pt-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {retryLabel}
              </Button>
            )}

            {onContactSupport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onContactSupport}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Contact Support
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default ErrorDisplay;
