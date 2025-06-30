import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, GitBranch, Loader2 } from "lucide-react";

export function GitHubDashboard() {
  return (
    <div className="mb-12 max-w-5xl mx-auto">
      <Card className="border-2 shadow-2xl py-0 pt-6 bg-jules-darker border-jules-primary">
        <CardHeader className="border-b border-jules-primary">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white flex items-center">
              <GitBranch className="w-5 h-5 mr-2 text-jules-primary" />
              my-awesome-project / Issues
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge
                variant="outline"
                className="bg-jules-secondary-10 border-jules-secondary text-jules-secondary"
              >
                8 Open
              </Badge>
              <Badge
                variant="outline"
                className="bg-jules-cyan-10 border-jules-cyan text-jules-cyan"
              >
                12 Closed
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="space-y-0">
            {/* Running Tasks */}
            <div className="flex items-center justify-between p-4 border-b hover:bg-opacity-50 border-jules-primary bg-jules-primary-5">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-4 h-4 animate-spin text-jules-accent" />
                <span className="text-white font-medium">
                  #347 Add comprehensive test suite for auth module
                </span>
                <Badge className="bg-jules-primary text-white text-xs">
                  jules
                </Badge>
              </div>
              <span className="text-sm text-jules-accent">Running (2/5)</span>
            </div>

            <div className="flex items-center justify-between p-4 border-b hover:bg-opacity-50 border-jules-primary bg-jules-primary-5">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-4 h-4 animate-spin text-jules-accent" />
                <span className="text-white font-medium">
                  #352 Upgrade to Next.js 15 and migrate to app directory
                </span>
                <Badge className="bg-jules-primary text-white text-xs">
                  jules
                </Badge>
              </div>
              <span className="text-sm text-jules-accent">Running (3/5)</span>
            </div>

            {/* Queued Tasks */}
            <div className="flex items-center justify-between p-4 border-b hover:bg-opacity-50 border-jules-primary bg-jules-yellow-5">
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-jules-yellow" />
                <span className="text-white font-medium">
                  #356 Fix memory leak in data processing pipeline
                </span>
                <Badge className="bg-jules-yellow text-black text-xs">
                  jules-queue
                </Badge>
              </div>
              <span className="text-sm text-jules-yellow">
                Queued (retry in 30 min)
              </span>
            </div>

            <div className="flex items-center justify-between p-4 border-b hover:bg-opacity-50 border-jules-primary bg-jules-yellow-5">
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-jules-yellow" />
                <span className="text-white font-medium">
                  #358 Implement dark mode toggle for user dashboard
                </span>
                <Badge className="bg-jules-yellow text-black text-xs">
                  jules-queue
                </Badge>
              </div>
              <span className="text-sm text-jules-yellow">
                Queued (retry in 30 min)
              </span>
            </div>

            {/* Completed Tasks */}
            <div className="flex items-center justify-between p-4 border-b hover:bg-opacity-50 border-jules-primary bg-jules-pink-5">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-4 h-4 text-jules-pink" />
                <span className="text-white font-medium">
                  #344 Add input validation to user registration form
                </span>
                <Badge className="bg-jules-pink text-white text-xs">
                  completed
                </Badge>
              </div>
              <span className="text-sm text-jules-pink">
                Completed 2 hours ago
              </span>
            </div>

            <div className="p-4 text-center border-b border-jules-primary">
              <span className="text-sm text-gray-400">
                + 15 more issues in queue...
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
