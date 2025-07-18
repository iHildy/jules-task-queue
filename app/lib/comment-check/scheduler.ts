import { JulesTask } from "@prisma/client";
import { getNextScheduledTime } from "app/lib/comment-check/getNextScheduledTime";
import { prisma } from "app/lib/prisma";

const BATCH_SIZE = 100;

export async function scheduleCommentCheck(task: JulesTask, now: Date) {
  const scheduledAt = getNextScheduledTime(now);

  await prisma.commentCheckJob.create({
    data: {
      taskId: task.id,
      owner: task.repoOwner,
      repo: task.repoName,
      issueNumber: Number(task.githubIssueNumber),
      scheduledAt,
    },
  });
}

export async function scheduleBatchOfCommentChecks(now: Date) {
  const scheduledAt = getNextScheduledTime(now);

  const tasks = await prisma.julesTask.findMany({
    where: {
      commentCheckJobs: {
        none: {},
      },
    },
    take: BATCH_SIZE,
  });

  await prisma.commentCheckJob.createMany({
    data: tasks.map((task) => ({
      taskId: task.id,
      owner: task.repoOwner,
      repo: task.repoName,
      issueNumber: Number(task.githubIssueNumber),
      scheduledAt,
    })),
  });
}
