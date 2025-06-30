import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function Disclaimer() {
  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Alert className="border bg-jules-darker border-jules-accent">
          <AlertCircle className="h-4 w-4 text-jules-accent" />
          <AlertDescription className="text-gray-300">
            <strong className="text-white">Disclaimer:</strong> JulesQueue is an
            independent productivity tool created by the developer community. We
            are not affiliated with Jules, Google, or Google Labs in any way.
            JulesQueue simply helps you manage your Jules task queue more
            efficiently.
          </AlertDescription>
        </Alert>
      </div>
    </section>
  );
}
