import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { LoadingSpinnerProps } from "@/types/components";

export function LoadingSpinner({
  size = "md",
  className,
  text,
}: LoadingSpinnerProps): React.JSX.Element {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2
        className={cn("animate-spin", sizeClasses[size])}
        aria-hidden="true"
      />
      {text && (
        <div
          className="text-sm text-white"
          role="status"
          aria-live="polite"
          aria-label={`Loading: ${text}`}
        >
          {text}
        </div>
      )}
    </div>
  );
}

export default LoadingSpinner;
