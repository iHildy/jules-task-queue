import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, GitBranch, Loader2 } from "lucide-react";

const tasks = [
  {
    id: 347,
    title: "Add comprehensive test suite for auth module",
    status: "running",
    statusText: "Running (2/5)",
    label: "jules",
    icon: (
      <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin text-jules-accent" />
    ),
    bgColor: "bg-jules-primary-5",
    labelColor: "bg-jules-primary text-white",
    textColor: "text-jules-accent",
  },
  {
    id: 352,
    title: "Upgrade to Next.js 15 and migrate to app directory",
    status: "running",
    statusText: "Running (3/5)",
    label: "jules",
    icon: (
      <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin text-jules-accent" />
    ),
    bgColor: "bg-jules-primary-5",
    labelColor: "bg-jules-primary text-white",
    textColor: "text-jules-accent",
  },
  {
    id: 356,
    title: "Fix memory leak in data processing pipeline",
    status: "queued",
    statusText: "Queued (retry in 30 min)",
    label: "jules-queue",
    icon: <Clock className="w-5 h-5 flex-shrink-0 text-jules-yellow" />,
    bgColor: "bg-jules-yellow-5",
    labelColor: "bg-jules-yellow text-black",
    textColor: "text-jules-yellow",
  },
  {
    id: 358,
    title: "Implement dark mode toggle for user dashboard",
    status: "queued",
    statusText: "Queued (retry in 30 min)",
    label: "jules-queue",
    icon: <Clock className="w-5 h-5 flex-shrink-0 text-jules-yellow" />,
    bgColor: "bg-jules-yellow-5",
    labelColor: "bg-jules-yellow text-black",
    textColor: "text-jules-yellow",
  },
  {
    id: 344,
    title: "Add input validation to user registration form",
    status: "completed",
    statusText: "Completed 2 hours ago",
    label: "completed",
    icon: <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-jules-pink" />,
    bgColor: "bg-jules-pink-5",
    labelColor: "bg-jules-pink text-white",
    textColor: "text-jules-pink",
  },
];

const TaskRow = ({ task }: { task: (typeof tasks)[0] }) => (
  <div
    className={`flex items-start space-x-4 p-4 border-b hover:bg-opacity-50 border-jules-primary ${task.bgColor}`}
  >
    <div className="flex-shrink-0 mt-1">{task.icon}</div>
    <div className="flex-grow flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-grow">
        <p className="text-white font-medium text-left text-sm sm:text-base">
          #{task.id} {task.title}
          <Badge
            className={`text-xs ${task.labelColor} ml-2 hidden sm:inline-flex`}
          >
            {task.label}
          </Badge>
        </p>
        <div className="flex items-center space-x-2 mt-2 sm:hidden">
          <Badge className={`text-xs ${task.labelColor}`}>{task.label}</Badge>
          <span className={`text-xs sm:text-sm ${task.textColor}`}>
            {task.statusText}
          </span>
        </div>
      </div>
      <div
        className={`hidden sm:block text-sm ${task.textColor} text-right ml-4 flex-shrink-0`}
      >
        {task.statusText}
      </div>
    </div>
  </div>
);

export function GitHubDashboard() {
  return (
    <div className="mb-12 max-w-5xl mx-auto">
      <Card className="border-2 shadow-2xl gap-0 py-0 pt-6 bg-jules-darker border-jules-primary">
        <CardHeader className="border-b border-jules-primary">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-semibold text-white flex items-center mb-2 sm:mb-0">
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
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
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
