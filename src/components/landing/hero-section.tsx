"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { Copy, ExternalLink, Zap } from "lucide-react";
import { useState } from "react";
import { GitHubDashboard } from "./github-dashboard";

export function HeroSection() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({
    children,
    copyId,
  }: {
    children: string;
    copyId: string;
  }) => (
    <div className="relative bg-gray-900 rounded-lg p-4 my-3">
      <pre className="text-sm text-gray-100 overflow-x-auto">
        <code>{children}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(children, copyId)}
        className="absolute top-2 right-2 p-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
      >
        {copied === copyId ? "✓" : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <section className="relative overflow-hidden pt-20 pb-16">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Badge
          variant="outline"
          className="mb-8 border-2 bg-jules-primary-10 border-jules-secondary/80 text-white text-sm"
        >
          <Zap className="w-4 h-4 mr-2" />
          An overengineered task queue for Jules users
        </Badge>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white">
          <span className="text-white">Break free from the</span>
          <br />
          <span className="text-jules-secondary">5-task bottleneck</span>
        </h1>

        <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto leading-relaxed text-jules-gray">
          Jules gives you 60 tasks per day but only 5 concurrent slots.
          JulesQueue automatically manages the queue so you can{" "}
          <span className="font-semibold text-jules-pink">
            actually use them all
          </span>
          .
        </p>

        <GitHubDashboard />

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
          <Button
            size="lg"
            className="bg-white text-jules-dark cursor-pointer hover:bg-white/90 ring-2 ring-transparent hover:ring-jules-primary"
          >
            <SiGithub /> Link GitHub Repository
          </Button>
        </div>

        {/* One-Click Deploy */}
        <div className="mb-8">
          <p className="text-gray-300 text-sm mb-4">
            Deploy your own instance:
          </p>
          <div className="flex gap-4 items-center justify-center">
            <a
              className=""
              href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FiHildy%2Fjules-task-queue&env=DATABASE_URL,GITHUB_TOKEN,GITHUB_WEBHOOK_SECRET,CRON_SECRET&envDescription=See%20the%20github%20repo%20.env.example%20file%20for%20the%20variables%20to%20add.&envLink=https%3A%2F%2Fgithub.com%2FiHildy%2Fjules-task-queue%2Fblob%2Fmain%2F.env.example&project-name=jules-task-queue&repository-name=jules-task-queue"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="mx-auto border border-[#414141] divide-x divide-[#414141] px-4 cursor-pointer"
              >
                <div className="pr-2">
                  <svg
                    width="1155"
                    height="1000"
                    viewBox="0 0 1155 1000"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                  >
                    <path
                      d="M577.344 0L1154.69 1000H0L577.344 0Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <p>Deploy to Vercel</p>
              </Button>
            </a>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="border border-[#FF9101] divide-x divide-[#FF9101] px-4 cursor-pointer"
                >
                  <div className="pr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="600"
                      height="600"
                      fill="none"
                      viewBox="0 0 600 600"
                      className="w-4 h-4"
                    >
                      <path
                        fill="#FF9100"
                        d="M213.918 560.499c23.248 9.357 48.469 14.909 74.952 15.834 35.84 1.252 69.922-6.158 100.391-20.234-36.537-14.355-69.627-35.348-97.869-61.448-18.306 29.31-45.382 52.462-77.474 65.848Z"
                      />
                      <path
                        fill="#FFC400"
                        d="M291.389 494.66c-64.466-59.622-103.574-145.917-100.269-240.568.108-3.073.27-6.145.46-9.216a166.993 166.993 0 0 0-36.004-5.241 167.001 167.001 0 0 0-51.183 6.153c-17.21 30.145-27.594 64.733-28.888 101.781-3.339 95.611 54.522 179.154 138.409 212.939 32.093-13.387 59.168-36.51 77.475-65.848Z"
                      />
                      <path
                        fill="#FF9100"
                        d="M291.39 494.657c14.988-23.986 24.075-52.106 25.133-82.403 2.783-79.695-50.792-148.251-124.942-167.381-.19 3.071-.352 6.143-.46 9.216-3.305 94.651 35.803 180.946 100.269 240.568Z"
                      />
                      <path
                        fill="#DD2C00"
                        d="M308.231 20.858C266 54.691 232.652 99.302 212.475 150.693c-11.551 29.436-18.81 61.055-20.929 94.2 74.15 19.13 127.726 87.686 124.943 167.38-1.058 30.297-10.172 58.390-25.134 82.404 28.24 26.127 61.331 47.093 97.868 61.447 73.337-33.9 125.37-106.846 128.383-193.127 1.952-55.901-19.526-105.724-49.875-147.778-32.051-44.477-159.5-194.36-159.5-194.36Z"
                      />
                    </svg>
                  </div>
                  <p>Deploy to Firebase</p>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[64rem] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 600 600"
                    >
                      <path
                        fill="#FF9100"
                        d="M213.918 560.499c23.248 9.357 48.469 14.909 74.952 15.834 35.84 1.252 69.922-6.158 100.391-20.234-36.537-14.355-69.627-35.348-97.869-61.448-18.306 29.31-45.382 52.462-77.474 65.848Z"
                      />
                      <path
                        fill="#FFC400"
                        d="M291.389 494.66c-64.466-59.622-103.574-145.917-100.269-240.568.108-3.073.27-6.145.46-9.216a166.993 166.993 0 0 0-36.004-5.241 167.001 167.001 0 0 0-51.183 6.153c-17.21 30.145-27.594 64.733-28.888 101.781-3.339 95.611 54.522 179.154 138.409 212.939 32.093-13.387 59.168-36.51 77.475-65.848Z"
                      />
                      <path
                        fill="#FF9100"
                        d="M291.39 494.657c14.988-23.986 24.075-52.106 25.133-82.403 2.783-79.695-50.792-148.251-124.942-167.381-.19 3.071-.352 6.143-.46 9.216-3.305 94.651 35.803 180.946 100.269 240.568Z"
                      />
                      <path
                        fill="#DD2C00"
                        d="M308.231 20.858C266 54.691 232.652 99.302 212.475 150.693c-11.551 29.436-18.81 61.055-20.929 94.2 74.15 19.13 127.726 87.686 124.943 167.38-1.058 30.297-10.172 58.390-25.134 82.404 28.24 26.127 61.331 47.093 97.868 61.447 73.337-33.9 125.37-106.846 128.383-193.127 1.952-55.901-19.526-105.724-49.875-147.778-32.051-44.477-159.5-194.36-159.5-194.36Z"
                      />
                    </svg>
                    Deploy to Firebase App Hosting
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <strong>Important:</strong> Your Firebase project must
                          be on the <strong>Blaze (Pay-as-you-go)</strong> plan
                          to use App Hosting.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Prerequisites
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Firebase project on Blaze plan</li>
                      <li>
                        Firebase CLI installed (
                        <code className="bg-gray-100 px-1 rounded">
                          npm install -g firebase-tools
                        </code>
                        )
                      </li>
                      <li>
                        GitHub repository with your forked version of this
                        project
                      </li>
                      <li>Required environment variables (see below)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Step 1: Install Firebase CLI
                    </h3>
                    <CodeBlock copyId="install-cli">
                      npm install -g firebase-tools
                    </CodeBlock>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Step 2: Login to Firebase
                    </h3>
                    <CodeBlock copyId="login">firebase login</CodeBlock>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Step 3: Initialize App Hosting
                    </h3>
                    <p className="text-sm mb-2">
                      Run this command in your project root directory:
                    </p>
                    <CodeBlock copyId="init">
                      firebase init apphosting
                    </CodeBlock>
                    <div className="text-sm space-y-1 mt-2">
                      <p>When prompted:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Select your Firebase project</li>
                        <li>
                          Choose a backend name (e.g.,
                          &quot;jules-task-queue&quot;)
                        </li>
                        <li>Select a region (e.g., &quot;us-central1&quot;)</li>
                        <li>
                          Set root directory to &quot;.&quot; (current
                          directory)
                        </li>
                        <li>Connect your GitHub repository</li>
                        <li>Set live branch (usually &quot;main&quot;)</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Step 4: Set Environment Variables
                    </h3>
                    <p className="text-sm mb-2">
                      Add these environment variables to your Firebase project:
                    </p>
                    <CodeBlock copyId="env-vars">{`firebase apphosting:secrets:set DATABASE_URL
firebase apphosting:secrets:set GITHUB_TOKEN  
firebase apphosting:secrets:set GITHUB_WEBHOOK_SECRET
firebase apphosting:secrets:set CRON_SECRET`}</CodeBlock>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Step 5: Deploy
                    </h3>
                    <CodeBlock copyId="deploy">
                      firebase deploy --only apphosting
                    </CodeBlock>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Step 6: Set up Scheduled Functions (for cron jobs)
                    </h3>
                    <p className="text-sm mb-2">
                      The project includes pre-configured Cloud Functions that
                      call your App Hosting retry endpoint:
                    </p>
                    <CodeBlock copyId="functions-deploy">{`cd functions
npm install
npm run build
cd ..
firebase deploy --only functions`}</CodeBlock>
                    <p className="text-sm mt-2">
                      This uses a centralized architecture - functions call your
                      App Hosting `/api/cron/retry` endpoint.
                    </p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> Complete setup instructions
                          including database configuration and GitHub webhooks
                          are available in the{" "}
                          <a
                            href="https://github.com/iHildy/jules-task-queue/blob/main/FIREBASE.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            FIREBASE.md
                          </a>{" "}
                          file in the repository.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button asChild className="flex-1">
                      <a
                        href="https://console.firebase.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Firebase Console
                      </a>
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                      <a
                        href="https://github.com/iHildy/jules-task-queue/blob/main/FIREBASE.md"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Full Documentation
                      </a>
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </section>
  );
}
