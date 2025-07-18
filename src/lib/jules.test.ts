import { db } from "@/server/db";
import { githubClient } from "@/lib/github";
import { processTaskRetry } from "@/lib/jules";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  db: {
    julesTask: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/github", () => ({
  githubClient: {
    getIssue: vi.fn(),
    swapLabels: vi.fn(),
  },
}));

describe("processTaskRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should skip retry for closed issues", async () => {
    const taskId = 1;
    const task = {
      id: taskId,
      flaggedForRetry: true,
      repoOwner: "test-owner",
      repoName: "test-repo",
      githubIssueNumber: 123,
      retryCount: 0,
    };
    const closedIssue = {
      state: "closed",
      labels: [],
    };

    (db.julesTask.findUnique as vi.Mock).mockResolvedValue(task);
    (githubClient.getIssue as vi.Mock).mockResolvedValue(closedIssue);

    const result = await processTaskRetry(taskId);

    expect(result).toBe(false);
    expect(db.julesTask.findUnique).toHaveBeenCalledWith({
      where: { id: taskId },
    });
    expect(githubClient.getIssue).toHaveBeenCalledWith(
      "test-owner",
      "test-repo",
      123,
    );
    expect(githubClient.swapLabels).not.toHaveBeenCalled();
    expect(db.julesTask.update).not.toHaveBeenCalled();
  });

  it("should process retry for open issues", async () => {
    const taskId = 2;
    const task = {
      id: taskId,
      flaggedForRetry: true,
      repoOwner: "test-owner",
      repoName: "test-repo",
      githubIssueNumber: 456,
      retryCount: 0,
    };
    const openIssue = {
      state: "open",
      labels: [],
    };

    (db.julesTask.findUnique as vi.Mock).mockResolvedValue(task);
    (githubClient.getIssue as vi.Mock).mockResolvedValue(openIssue);
    (githubClient.swapLabels as vi.Mock).mockResolvedValue(undefined);
    (db.julesTask.update as vi.Mock).mockResolvedValue(undefined);

    const result = await processTaskRetry(taskId);

    expect(result).toBe(true);
    expect(db.julesTask.findUnique).toHaveBeenCalledWith({
      where: { id: taskId },
    });
    expect(githubClient.getIssue).toHaveBeenCalledWith(
      "test-owner",
      "test-repo",
      456,
    );
    expect(githubClient.swapLabels).toHaveBeenCalledWith(
      "test-owner",
      "test-repo",
      456,
      "jules-queue",
      "jules",
    );
    expect(db.julesTask.update).toHaveBeenCalledWith({
      where: { id: taskId },
      data: {
        flaggedForRetry: false,
        retryCount: 1,
        lastRetryAt: expect.any(Date),
      },
    });
  });
});
