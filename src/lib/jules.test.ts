import { describe, it, expect, vi, beforeEach } from "vitest";
import { processTaskRetry } from "./jules";
import { db } from "@/server/db";
import { githubClient } from "@/lib/github";

// Mock dependencies
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
    vi.resetAllMocks();
  });

  it("should skip retry if jules-queue label is missing", async () => {
    const taskId = 1;
    const task = {
      id: taskId,
      flaggedForRetry: true,
      repoOwner: "test-owner",
      repoName: "test-repo",
      githubIssueNumber: 123,
      retryCount: 0,
    };

    (db.julesTask.findUnique as vi.Mock).mockResolvedValue(task);
    (githubClient.getIssue as vi.Mock).mockResolvedValue({
      labels: [{ name: "some-other-label" }],
    });

    const result = await processTaskRetry(taskId);

    expect(result).toBe(false);
    expect(db.julesTask.update).toHaveBeenCalledWith({
      where: { id: taskId },
      data: { flaggedForRetry: false, updatedAt: expect.any(Date) },
    });
    expect(githubClient.swapLabels).not.toHaveBeenCalled();
  });
});
