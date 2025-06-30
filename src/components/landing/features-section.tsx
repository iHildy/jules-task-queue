import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Code, GitBranch, Repeat, Server, Shield, Zap } from "lucide-react";

export function FeaturesSection() {
  return (
    <section className="py-24 bg-jules-secondary-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Built for Jules Power Users
          </h2>
          <p className="text-xl text-gray-300">
            Enterprise-grade automation that just works
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border bg-jules-darker border-jules-primary">
            <CardContent className="p-6">
              <Shield className="w-8 h-8 mb-4 text-jules-cyan" />
              <CardTitle className="text-lg text-white mb-2">
                Smart Task Detection
              </CardTitle>
              <CardDescription className="text-gray-300">
                Automatically detects when Jules starts tasks and when limits
                are hit, intelligently queueing tasks for retry
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border bg-jules-darker border-jules-primary">
            <CardContent className="p-6">
              <Repeat className="w-8 h-8 mb-4 text-jules-pink" />
              <CardTitle className="text-lg text-white mb-2">
                Auto-Retry Logic
              </CardTitle>
              <CardDescription className="text-gray-300">
                30-minute retry cycles with intelligent label swapping and
                failure recovery for seamless automation
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border bg-jules-darker border-jules-primary">
            <CardContent className="p-6">
              <Server className="w-8 h-8 mb-4 text-jules-primary" />
              <CardTitle className="text-lg text-white mb-2">
                Easy Self-Hosting
              </CardTitle>
              <CardDescription className="text-gray-300">
                Built-in checks ensure errors happen at build time with
                descriptive messages, making deployment foolproof
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border bg-jules-darker border-jules-primary">
            <CardContent className="p-6">
              <GitBranch className="w-8 h-8 mb-4 text-jules-accent" />
              <CardTitle className="text-lg text-white mb-2">
                GitHub Native
              </CardTitle>
              <CardDescription className="text-gray-300">
                Webhook integration with signature verification and
                comprehensive audit logging for security
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border bg-jules-darker border-jules-primary">
            <CardContent className="p-6">
              <Code className="w-8 h-8 mb-4 text-jules-cyan" />
              <CardTitle className="text-lg text-white mb-2">
                Type Safe
              </CardTitle>
              <CardDescription className="text-gray-300">
                End-to-end TypeScript with tRPC and Zod validation for
                bulletproof deployments and runtime safety
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border bg-jules-darker border-jules-primary">
            <CardContent className="p-6">
              <Zap className="w-8 h-8 mb-4 text-jules-yellow" />
              <CardTitle className="text-lg text-white mb-2">
                Zero Config
              </CardTitle>
              <CardDescription className="text-gray-300">
                Deploy to Vercel with environment variables - no complex setup
                required, just configure and go
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
