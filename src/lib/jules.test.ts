import { githubClient } from "@/lib/github";
import { db } from "@/server/db";
import { processTaskRetry } from "./jules";

// Mock the dependencies
jest.mock("@/lib/github");
jest.mock("@/server/db");

const mockedGithubClient = githubClient as jest.Mocked<typeof githubClient>;
const mockedDb = db as jest.Mocked<typeof db>;

describe("processTaskRetry", () => {
  it("should skip swapping labels if the jules-queue label is not present", async () => {
    // Arrange
    const taskId = 1;
    const task = {
      id: taskId,
      flaggedForRetry: true,
      repoOwner: "test-owner",
      repoName: "test-repo",
      githubIssueNumber: 123,
      retryCount: 0,
    };
    const issue = {
      labels: [{ name: "some-other-label" }],
    };

    mockedDb.julesTask.findUnique.mockResolvedValue(task as any);
    mockedGithubClient.getIssue.mockResolvedValue(issue as any);

    // Act
    const result = await processTaskRetry(taskId);

    // Assert
    expect(mockedDb.julesTask.findUnique).toHaveBeenCalledWith({
      where: { id: taskId },
    });
    expect(mockedGithubClient.getIssue).toHaveBeenCalledWith(
      "test-owner",
      "test-repo",
      123,
    );
    expect(mockedGithubClient.swapLabels).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
