import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = "Loading..." }: PageLoadingProps) {
  return (
    <div className="min-h-screen bg-jules-dark flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
