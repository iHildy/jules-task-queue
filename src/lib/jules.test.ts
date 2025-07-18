import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryAllFlaggedTasks } from './jules';
import { db } from '@/server/db';
import { githubClient } from '@/lib/github';

describe('Jules Library Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  describe('retryAllFlaggedTasks', () => {
    it('should retry all flagged tasks and skip tasks with "Human" label', async () => {
      // Arrange
      const mockTasks = [
        { id: 1, flaggedForRetry: true, repoOwner: 'test', repoName: 'test-repo', githubIssueNumber: 1, retryCount: 0 },
        { id: 2, flaggedForRetry: true, repoOwner: 'test', repoName: 'test-repo', githubIssueNumber: 2, retryCount: 0 },
        { id: 3, flaggedForRetry: true, repoOwner: 'test', repoName: 'test-repo', githubIssueNumber: 3, retryCount: 0 },
      ];

      vi.spyOn(db.julesTask, 'findMany').mockResolvedValue(mockTasks);

      // Task 2 has a "Human" label
      vi.spyOn(githubClient, 'getIssue').mockImplementation(async (owner, repo, issueNumber) => {
        if (issueNumber === 2) {
          return { labels: [{ name: 'Human' }] } as any;
        }
        return { labels: [] } as any;
      });

      vi.spyOn(db.julesTask, 'findUnique').mockImplementation(async (query) => {
        const id = query.where.id;
        return mockTasks.find(task => task.id === id) as any;
      });

      vi.spyOn(githubClient, 'swapLabels').mockResolvedValue(undefined);
      vi.spyOn(db.julesTask, 'update').mockResolvedValue({} as any);

      // Act
      const result = await retryAllFlaggedTasks();

      // Assert
      expect(db.julesTask.findMany).toHaveBeenCalledWith({
        where: { flaggedForRetry: true },
        orderBy: { createdAt: 'asc' },
      });

      // Verify that getIssue was called for each task
      expect(githubClient.getIssue).toHaveBeenCalledTimes(3);
      expect(githubClient.getIssue).toHaveBeenCalledWith('test', 'test-repo', 1);
      expect(githubClient.getIssue).toHaveBeenCalledWith('test', 'test-repo', 2);
      expect(githubClient.getIssue).toHaveBeenCalledWith('test', 'test-repo', 3);

      // Verify that swapLabels was not called for the task with "Human" label
      expect(githubClient.swapLabels).toHaveBeenCalledTimes(2);
      expect(githubClient.swapLabels).toHaveBeenCalledWith('test', 'test-repo', 1, 'jules-queue', 'jules');
      expect(githubClient.swapLabels).not.toHaveBeenCalledWith('test', 'test-repo', 2, 'jules-queue', 'jules');
      expect(githubClient.swapLabels).toHaveBeenCalledWith('test', 'test-repo', 3, 'jules-queue', 'jules');

      // Verify database updates
      expect(db.julesTask.update).toHaveBeenCalledTimes(2);
      expect(db.julesTask.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          flaggedForRetry: false,
          retryCount: 1,
          lastRetryAt: expect.any(Date),
        },
      });
      expect(db.julesTask.update).not.toHaveBeenCalledWith({
        where: { id: 2 },
        data: expect.any(Object),
      });
      expect(db.julesTask.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: {
          flaggedForRetry: false,
          retryCount: 1,
          lastRetryAt: expect.any(Date),
        },
      });

      // Verify the result statistics
      expect(result).toEqual({
        attempted: 3,
        successful: 2,
        failed: 0,
        skipped: 1,
      });
    });

    it('should handle errors during task processing', async () => {
      // Arrange
      const mockTasks = [
        { id: 1, flaggedForRetry: true, repoOwner: 'test', repoName: 'test-repo', githubIssueNumber: 1, retryCount: 0 },
        { id: 2, flaggedForRetry: true, repoOwner: 'test', repoName: 'test-repo', githubIssueNumber: 2, retryCount: 0 },
      ];

      vi.spyOn(db.julesTask, 'findMany').mockResolvedValue(mockTasks);

      // Task 1 will succeed, Task 2 will fail
      vi.spyOn(githubClient, 'getIssue').mockResolvedValue({ labels: [] } as any);
      vi.spyOn(githubClient, 'swapLabels').mockImplementation(async (owner, repo, issueNumber) => {
        if (issueNumber === 2) {
          throw new Error('Failed to swap labels');
        }
      });

      vi.spyOn(db.julesTask, 'findUnique').mockImplementation(async (query) => {
        const id = query.where.id;
        return mockTasks.find(task => task.id === id) as any;
      });

      vi.spyOn(db.julesTask, 'update').mockResolvedValue({} as any);

      // Act
      const result = await retryAllFlaggedTasks();

      // Assert
      expect(result).toEqual({
        attempted: 2,
        successful: 1,
        failed: 1,
        skipped: 0,
      });

      // Verify that swapLabels was called for both tasks
      expect(githubClient.swapLabels).toHaveBeenCalledTimes(2);
      expect(githubClient.swapLabels).toHaveBeenCalledWith('test', 'test-repo', 1, 'jules-queue', 'jules');
      expect(githubClient.swapLabels).toHaveBeenCalledWith('test', 'test-repo', 2, 'jules-queue', 'jules');

      // Verify database updates for the successful task
      expect(db.julesTask.update).toHaveBeenCalledTimes(1);
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
});
