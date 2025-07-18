import { upsertJulesTask, handleTaskLimit } from "../src/lib/jules.js";
import { db } from "../src/server/db.js";

async function main() {
  const taskParams = {
    githubRepoId: 12345n,
    githubIssueId: 67890n,
    githubIssueNumber: 1n,
    repoOwner: "test-owner",
    repoName: "test-repo",
    installationId: 1,
  };

  try {
    console.log("Creating a new task...");
    const task = await upsertJulesTask(taskParams);
    console.log("Task created:", task);

    console.log("Flagging task for retry...");
    await handleTaskLimit(
      taskParams.repoOwner,
      taskParams.repoName,
      Number(taskParams.githubIssueNumber),
      task.id
    );
    console.log("Task flagged for retry.");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await db.$disconnect();
    console.log("Database connection closed.");
  }
}

main();
