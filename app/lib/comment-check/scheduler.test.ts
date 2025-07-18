import { JulesTask } from "@prisma/client";
import {
  scheduleBatchOfCommentChecks,
  scheduleCommentCheck,
} from "app/lib/comment-check/scheduler";
import { prisma } from "app/lib/prisma";
import { clearDatabase } from "test/clearDatabase";
import { julesTaskFactory } from "test/factories/julesTask";

describe("scheduleCommentCheck", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("schedules a comment check for the given task", async () => {
    const task = await julesTaskFactory.create();
    const now = new Date("2024-01-01T10:00:00Z");

    await scheduleCommentCheck(task, now);

    const jobs = await prisma.commentCheckJob.findMany();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].taskId).toBe(task.id);
    expect(jobs[0].scheduledAt).toEqual(new Date("2024-01-01T11:00:00.000Z"));
  });
});

describe("scheduleBatchOfCommentChecks", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("schedules a batch of comment checks", async () => {
    const tasks = await julesTaskFactory.createList(3);
    const now = new Date("2024-01-01T10:00:00Z");

    await scheduleBatchOfCommentChecks(now);

    const jobs = await prisma.commentCheckJob.findMany();
    expect(jobs).toHaveLength(3);
    for (const job of jobs) {
      expect(tasks.find((t) => t.id === job.taskId)).toBeDefined();
      expect(job.scheduledAt).toEqual(new Date("2024-01-01T11:00:00.000Z"));
    }
  });

  it("schedules only for tasks that have not been scheduled yet", async () => {
    const tasks = await julesTaskFactory.createList(3);
    const now = new Date("2024-01-01T10:00:00Z");
    await scheduleCommentCheck(tasks[0], now);

    await scheduleBatchOfCommentChecks(now);

    const jobs = await prisma.commentCheckJob.findMany();
    expect(jobs).toHaveLength(3);
    for (const job of jobs) {
      expect(tasks.find((t) => t.id === job.taskId)).toBeDefined();
    }
  });
});
