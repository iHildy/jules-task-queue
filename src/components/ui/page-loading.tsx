import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { PageLoadingProps } from "@/types/components";

export function PageLoading({
  text = "Loading...",
}: PageLoadingProps): React.JSX.Element {
  return (
    <div
      className="min-h-screen bg-jules-dark flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={`Page loading: ${text}`}
    >
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
