import { retryAllFlaggedTasks } from './jules';
import { db } from '@/server/db';
import { githubClient } from '@/lib/github';

// Mock the database and GitHub client
jest.mock('@/server/db', () => ({
  db: {
    julesTask: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/github', () => ({
  githubClient: {
    swapLabels: jest.fn(),
    getIssue: jest.fn().mockResolvedValue({ labels: [] }),
  },
}));

describe('retryAllFlaggedTasks', () => {
  it('should retry a single flagged task', async () => {
    // Arrange
    const flaggedTask = {
      id: 1,
      githubIssueId: 123,
      githubIssueNumber: 456,
      repoOwner: 'test-owner',
      repoName: 'test-repo',
      installationId: 789,
      flaggedForRetry: true,
      retryCount: 0,
    };

    (db.julesTask.findMany as jest.Mock).mockResolvedValue([flaggedTask]);
    (db.julesTask.update as jest.Mock).mockResolvedValue({});
    (githubClient.swapLabels as jest.Mock).mockResolvedValue(undefined);

    // Act
    await retryAllFlaggedTasks();

    // Assert
    expect(githubClient.swapLabels).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      456,
      'jules-queue',
      'jules'
    );

    expect(db.julesTask.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        flaggedForRetry: false,
        retryCount: 1,
        lastRetryAt: expect.any(Date),
      },
    });
  });
});
