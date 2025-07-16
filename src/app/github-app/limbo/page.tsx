"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function LimboPage() {
  const router = useRouter();

  const handleCheckStatus = () => {
    // Redirect back to the success page to re-check the star status
    router.push("/github-app/success");
  };

  return (
    <div className="min-h-screen bg-jules-dark flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Almost there!</h1>
        <p className="text-lg text-gray-300 mb-8">
          Please star our repository to continue. It&apos;s a small way to show
          your support!
        </p>
        <a
          href="https://github.com/iHildy/jules-task-queue"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          Click here to star the repository
        </a>
        <div className="mt-8">
          <Button onClick={handleCheckStatus}>
            I&apos;ve starred the repo, continue!
          </Button>
        </div>
      </div>
    </div>
  );
}
