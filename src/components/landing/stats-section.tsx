import { Card, CardContent } from "@/components/ui/card";
import { appRouter } from "@/server/api/root";
import { createCallerFactory } from "@/server/api/trpc";
import { db } from "@/server/db";
import { env } from "@/lib/env";

export async function StatsSection() {
  const createCaller = createCallerFactory(appRouter);
  const caller = createCaller({
    headers: new Headers(),
    db,
    env,
  });

  let stats;
  try {
    stats = await caller.tasks.publicStats();
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return null;
  }

  const statItems = [
    {
      label: "Total Tasks Processed",
      value: stats.totalTasks.toLocaleString(),
      description: "GitHub issues processed through the queue",
      borderColor: "border-jules-primary",
      textColor: "text-jules-primary",
    },
    {
      label: "Total Retries Handled",
      value: stats.totalRetries.toLocaleString(),
      description: "Tasks automatically retried when Jules hit limits",
      borderColor: "border-jules-pink",
      textColor: "text-jules-pink",
    },
    {
      label: "Repositories Connected",
      value: stats.totalRepositories.toLocaleString(),
      description: "Repositories with the queue integration",
      borderColor: "border-jules-cyan",
      textColor: "text-jules-cyan",
    },
  ];

  return (
    <section className="py-16 bg-jules-secondary-5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Jules Queue in Numbers
          </h2>
          <p className="text-lg text-gray-300">
            Statistics from our hosted deployment
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {statItems.map((stat) => (
            <Card
              key={stat.label}
              className={`border bg-jules-darker ${stat.borderColor}`}
            >
              <CardContent className="p-6 text-center">
                <div className={`text-3xl font-bold mb-2 ${stat.textColor}`}>
                  {stat.value}
                </div>
                <div className="text-white">{stat.label}</div>
                <div className="text-sm text-gray-400 mt-2">
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
