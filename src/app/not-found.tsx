import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found | Jules Task Queue",
  description:
    "The page you're looking for doesn't exist. Return to the Jules Task Queue homepage.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-jules-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-jules-primary/10 border border-jules-primary/20">
            <Search className="h-12 w-12 text-jules-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Page Not Found</h1>
          <p className="text-lg text-jules-gray">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            className="bg-jules-primary hover:bg-jules-secondary text-white"
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go home
            </Link>
          </Button>
        </div>

        <div className="pt-6 border-t border-jules-gray/20">
          <p className="text-sm text-jules-gray">
            If you believe this is an error, please{" "}
            <a
              href="https://github.com/iHildy/jules-task-queue/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-jules-accent hover:underline"
            >
              report it on GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
