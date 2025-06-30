import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import Link from "next/link";

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md border-b bg-jules-dark-80 border-jules-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-jules-primary">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-bold text-xl text-white">JulesQueue</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/api/health"
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              Health
            </Link>
            <Button asChild className="bg-jules-primary hover:opacity-90">
              <Link href="https://github.com/ihildy/jules-task-queue">
                <GitBranch className="w-4 h-4 mr-2" />
                GitHub
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
