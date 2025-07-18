import { githubClient } from "@/lib/github";
import { db } from "@/server/db";
import { retryAllFlaggedTasks } from "./jules";

// Mock the dependencies
jest.mock("@/lib/github");
jest.mock("@/server/db");

describe("Jules Task Queue Tests", () => {
  // Test case QUEUE_TEST_4
  test("should retry a task that is flagged for retry", async () => {
    // Mock the database to return a flagged task
    const mockTask = {
      id: 1,
      githubRepoId: 123,
      githubIssueId: 456,
      githubIssueNumber: 789,
      repoOwner: "test-owner",
      repoName: "test-repo",
      installationId: 1,
      flaggedForRetry: true,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRetryAt: null,
    };
    (db.julesTask.findMany as jest.Mock).mockResolvedValue([mockTask]);
    (db.julesTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
    (db.julesTask.update as jest.Mock).mockResolvedValue({ ...mockTask, flaggedForRetry: false });

    // Mock the GitHub client to simulate label swapping
    (githubClient.getIssue as jest.Mock).mockResolvedValue({ labels: [] });
    const swapLabelsMock = jest.fn().mockResolvedValue(undefined);
    (githubClient.swapLabels as jest.Mock) = swapLabelsMock;

    // Call the function to test
    await retryAllFlaggedTasks();

    // Assert that the label swap was called correctly
    expect(swapLabelsMock).toHaveBeenCalledWith(
      "test-owner",
      "test-repo",
      789,
      "jules-queue",
      "jules"
    );
  });
});
