import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md border-b bg-jules-dark-80 border-jules-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Image
              src="/julesQueue.jpg"
              alt="Jules Task Queue"
              width={32}
              height={32}
            />
            <span className="font-bold text-lg sm:text-xl text-white">
              Jules Task Queue
            </span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/api/health"
              className="hidden sm:block text-gray-300 hover:text-white transition-colors text-sm px-2 py-1 rounded-md sm:px-0 sm:py-0 sm:rounded-none"
            >
              Health
            </Link>
            <Button
              asChild
              size="sm"
              className="bg-white text-jules-dark cursor-pointer hover:bg-white/90 ring-2 ring-transparent hover:ring-jules-primary font-semibold"
            >
              <Link
                href="https://github.com/ihildy/jules-task-queue"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitBranch className="w-4 h-4 mr-1" />
                <span>GitHub</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
