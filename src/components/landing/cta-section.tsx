import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import Link from "next/link";
import { GitHubInstallButton } from "./github-install-button";

export function CTASection() {
  return (
    <section className="py-24 bg-jules-primary-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
          Ready to unlock all 60 tasks?
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          Stop babysitting the queue. Start shipping faster.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <GitHubInstallButton />
          <div className="text-center">
            <Button
              variant="outline"
              asChild
              size="lg"
              className="border-2 border-jules-secondary text-jules-secondary"
            >
              <Link href="https://github.com/ihildy/jules-task-queue">
                <Star className="w-4 h-4 mr-2" />
                Star on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
