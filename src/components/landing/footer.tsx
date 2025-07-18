import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import Link from "next/link";
import { Disclaimer } from "./disclaimer";

export function Footer() {
  return (
    <footer className="border-t py-12 bg-jules-dark border-jules-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
              <Image
                src="/julesQueue.jpg"
                alt="Jules Task Queue"
                width={32}
                height={32}
              />
              <span className="font-bold text-xl text-white">
                Jules Task Queue
              </span>
            </div>
            <p className="text-gray-300">
              The community-built productivity tool that unlocks Jules&rsquo;
              full potential.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <div className="space-y-2">
              <Link
                href="/api/health"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Health Check
              </Link>
              <Link
                href="https://github.com/ihildy/jules-task-queue"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                GitHub Repository
              </Link>
              <Link
                href="https://github.com/ihildy/jules-task-queue/blob/main/API_DOCUMENTATION.md"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                API Documentation
              </Link>
              <Link
                href="https://jules.google/"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Jules Official Site
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Community</h3>
            <div className="space-y-2">
              <Link
                href="https://github.com/ihildy/jules-task-queue/issues"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Issues
              </Link>
              <Link
                href="https://github.com/ihildy/jules-task-queue/pulls"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Pull Requests
              </Link>
              <Link
                href="https://github.com/ihildy/jules-task-queue/blob/main/CONTRIBUTING.md"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Contributing
              </Link>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-jules-primary" />

        <div className="text-center text-gray-400">
          <p>MIT License. Built by the community, for the community.</p>
        </div>
        <Disclaimer />
      </div>
    </footer>
  );
}
