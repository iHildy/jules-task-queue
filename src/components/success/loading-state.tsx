import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function LoadingState() {
  return (
    <div className="min-h-screen bg-jules-dark flex items-center justify-center px-4">
      <LoadingSpinner
        size="lg"
        className="text-white"
        text="Processing installation..."
      />
    </div>
  );
}
