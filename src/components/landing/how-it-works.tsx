import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { GitHubInstallButton } from "./github-install-button";

export function HowItWorks() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Set It and Forget It
          </h2>
          <p className="text-xl text-gray-300">
            Three simple steps to unlock Jules&rsquo; full potential
          </p>
        </div>

        <Tabs defaultValue="hosted" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8 bg-jules-darker border-jules-primary">
            <TabsTrigger
              value="hosted"
              className="data-[state=active]:bg-jules-primary text-white cursor-pointer"
            >
              Hosted
            </TabsTrigger>
            <TabsTrigger
              value="self-hosted"
              className="data-[state=active]:bg-jules-primary text-white cursor-pointer"
            >
              Self-Hosted
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hosted" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center border-2 bg-jules-darker border-jules-primary">
                <CardContent className="p-8">
                  <div className="w-16 h-16 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 bg-jules-primary">
                    1
                  </div>
                  <CardTitle className="text-xl text-white mb-4">
                    Add to GitHub Repository
                  </CardTitle>
                  <GitHubInstallButton />
                  <CardDescription className="text-gray-300 mt-4">
                    GitHub webhooks and issue labels are configured
                    automatically
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center border-2 bg-jules-darker border-jules-pink">
                <CardContent className="p-8">
                  <div className="w-16 h-16 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 bg-jules-pink">
                    2
                  </div>
                  <CardTitle className="text-xl text-white mb-4">
                    Assign the Jules Label
                  </CardTitle>
                  <div className="rounded-lg p-4 mb-4 bg-jules-dark flex items-center justify-center">
                    <Badge className="bg-jules-primary text-white text-xs px-3 py-1 rounded-full border border-jules-primary/20">
                      jules
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-300">
                    Add the jules label to any GitHub issue to start automated
                    processing
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center border-2 bg-jules-darker border-jules-cyan">
                <CardContent className="p-8">
                  <div className="w-16 h-16 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 bg-jules-cyan">
                    3
                  </div>
                  <CardTitle className="text-xl text-white mb-4">
                    Watch It Work
                  </CardTitle>
                  <div className="rounded-lg p-4 mb-4 bg-jules-dark">
                    <code className="text-sm text-jules-pink">
                      Auto-retry every 30 minutes
                    </code>
                  </div>
                  <CardDescription className="text-gray-300">
                    Tasks that hit the limit are automatically queued and
                    retried every 30 minutes
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Link
                href="https://github.com/ihildy/jules-task-queue/blob/main/HOSTED.md"
                className="inline-flex items-center text-jules-cyan hover:text-jules-cyan/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                View detailed hosted setup guide
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="self-hosted" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center border-2 bg-jules-darker border-jules-primary">
                <CardContent className="p-8">
                  <div className="w-16 h-16 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 bg-jules-primary">
                    1
                  </div>
                  <CardTitle className="text-xl text-white mb-4">
                    Environment Setup
                  </CardTitle>
                  <div className="rounded-lg p-4 mb-4 bg-jules-dark">
                    <code className="text-sm text-jules-cyan">
                      Configure .env file
                    </code>
                  </div>
                  <CardDescription className="text-gray-300">
                    Set up GitHub token, webhook secret, database URL, and cron
                    secret
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center border-2 bg-jules-darker border-jules-pink">
                <CardContent className="p-8">
                  <div className="w-16 h-16 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 bg-jules-pink">
                    2
                  </div>
                  <CardTitle className="text-xl text-white mb-4">
                    Deploy Services
                  </CardTitle>
                  <div className="rounded-lg p-4 mb-4 bg-jules-dark">
                    <code className="text-sm text-jules-yellow">
                      docker-compose up -d
                    </code>
                  </div>
                  <CardDescription className="text-gray-300">
                    Launch the app, database, and automated cron services using
                    Docker Compose
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center border-2 bg-jules-darker border-jules-cyan">
                <CardContent className="p-8">
                  <div className="w-16 h-16 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 bg-jules-cyan">
                    3
                  </div>
                  <CardTitle className="text-xl text-white mb-4">
                    Configure GitHub Webhooks
                  </CardTitle>
                  <div className="rounded-lg p-4 mb-4 bg-jules-dark">
                    <code className="text-sm text-jules-accent">
                      Repository → Settings → Webhooks
                    </code>
                  </div>
                  <CardDescription className="text-gray-300">
                    Add webhook URL pointing to your domain and enable
                    &ldquo;Issues&rdquo; events
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Link
                href="https://github.com/ihildy/jules-task-queue/blob/main/SELF_HOSTING.md"
                className="inline-flex items-center text-jules-cyan hover:text-jules-cyan/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                View detailed self-hosting guide
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
