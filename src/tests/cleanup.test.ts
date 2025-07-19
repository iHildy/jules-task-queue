import { db } from "@/server/db";
import { cleanupOldTasks } from "@/lib/jules";
import { JulesTask } from "@prisma/client";

// Mock the database
jest.mock("@/server/db", () => ({
  db: {
    julesTask: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe("cleanupOldTasks", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it("should delete tasks older than the specified number of days", async () => {
    // Arrange
    const olderThanDays = 3;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const oldTask: JulesTask = {
      id: 1,
      githubRepoId: 123,
      githubIssueId: 456,
      githubIssueNumber: 1,
      repoOwner: "test-owner",
      repoName: "test-repo",
      installationId: 789,
      flaggedForRetry: false,
      retryCount: 0,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      lastRetryAt: null,
    };

    const recentTask: JulesTask = {
      id: 2,
      githubRepoId: 123,
      githubIssueId: 789,
      githubIssueNumber: 2,
      repoOwner: "test-owner",
      repoName: "test-repo",
      installationId: 789,
      flaggedForRetry: false,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRetryAt: null,
    };

    (db.julesTask.findMany as jest.Mock).mockResolvedValue([oldTask, recentTask]);
    (db.julesTask.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    // Act
    const deletedCount = await cleanupOldTasks(olderThanDays);

    // Assert
    expect(db.julesTask.deleteMany).toHaveBeenCalledWith({
      where: {
        flaggedForRetry: false,
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });
    expect(deletedCount).toBe(1);
  });
});
