import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start max-w-4xl">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-bold mb-4 bg-[#715CD7] bg-clip-text text-transparent">
            Jules Task Queueing System
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mb-6">
            A GitHub-integrated service that manages task overflow for the
            Google Labs Jules AI assistant. Automatically queues tasks when
            Jules reaches concurrent limits and retries them intelligently.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">🔄 Smart Queueing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatically detects when Jules hits task limits and queues work
              for retry
            </p>
          </div>

          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">⚡ Real-time Processing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              60-second delay monitoring with intelligent comment detection
            </p>
          </div>

          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">🚀 Easy Deploy</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              One-click Vercel deployment with minimal configuration required
            </p>
          </div>

          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">🤖 Self-host Easily</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Strict built in checks to ensure errors happen at build time with
              descriptive errors.
            </p>
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <div className="space-y-3 text-gray-600 dark:text-gray-300">
            <div className="flex flex-wrap items-start gap-3">
              <span className="text-blue-500 font-bold">1.</span>
              <p>
                User adds &apos;jules&apos; label to GitHub issue → GitHub
                webhook triggers
              </p>

              <span className="basis-full text-gray-500 dark:text-gray-400 text-sm">
                Jules github bot will comment on the issue (started or task
                limit reached)
              </span>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">2.</span>
              <p>System waits 60 seconds then checks for Jules bot comments</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">3.</span>
              <p>
                If task limit reached, moves task to &apos;jules-queue&apos; for
                retry
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">4.</span>
              <p>
                Cron job retries queued tasks every 30 minutes by assigning the
                &apos;jules&apos; tag
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Contributing</h2>
          <div className="space-y-4 text-gray-600 dark:text-gray-300">
            <p>
              This is an open-source project designed to help manage Jules AI
              task overflow. We welcome contributions from the community!
            </p>
            <div className="space-y-2">
              <p>
                <strong>Setup:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Clone the repository</li>
                <li>
                  Copy{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    .env.example
                  </code>{" "}
                  to{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    .env.local
                  </code>
                </li>
                <li>Set your GitHub token and webhook secret</li>
                <li>
                  Run{" "}
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    pnpm install && pnpm dev
                  </code>
                </li>
              </ol>
            </div>
            <div className="space-y-2">
              <p>
                <strong>Key Areas for Contribution:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Webhook processing and error handling</li>
                <li>Comment detection algorithms</li>
                <li>Retry logic optimization</li>
                <li>Testing and documentation</li>
                <li>Performance improvements</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://github.com/ihildy/jules-task-queue"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </Link>
          <Link
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
          >
            Health Check
          </Link>
        </div>
      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm text-gray-500">
        <span>Jules Task Queueing System v0.1.0</span>
        <span>•</span>
        <span>Built with Next.js, tRPC, and Prisma</span>
      </footer>
    </div>
  );
}
