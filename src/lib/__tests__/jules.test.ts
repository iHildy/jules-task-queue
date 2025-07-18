import {Jules} from '@/lib/jules';
import {type LlmResponse} from '@/types';
import {type Result} from '@/lib/utils';
import {Octokit} from '@octokit/rest';
import {describe, beforeEach, it, expect, vi} from 'vitest';

const mockGetPullRequest = vi.fn();
const mockConfig = {
  jules: {
    labels: {
      highPrio: 'high-prio',
      inProgress: 'in-progress',
      readyForReview: 'ready-for-review',
    },
  },
};
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;
const mockGetPullRequest = vi.fn();
const mockSwapLabels = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

const mockGithub = {
  getPullRequest: mockGetPullRequest,
  swapLabels: mockSwapLabels,
} as any;

const mockDb = {
  task: {
    findMany: mockFindMany,
    update: mockUpdate,
  },
} as any;

describe('Jules', () => {
  let jules: Jules;

  beforeEach(() => {
    vi.clearAllMocks();
    jules = new Jules({
      config: mockConfig,
      db: mockDb,
      github: mockGithub,
      logger: mockLogger,
      model: {} as any,
    });
  });

  describe('processPullRequest', () => {
    it('should return an error if the PR is not found', async () => {
      mockGetPullRequest.mockResolvedValue({
        isSuccess: false,
        error: 'PR not found',
      });
      const result = await jules.processPullRequest({
        octokit: new Octokit(),
        owner: 'test-owner',
        repo: 'test-repo',
        pullNumber: 1,
      });
      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error).toBe('PR not found');
      }
    });

    it('should return an error if the PR has no description', async () => {
      mockGetPullRequest.mockResolvedValue({
        isSuccess: true,
        value: {
          body: null,
          labels: [],
        },
      });

      const result = await jules.processPullRequest({
        octokit: new Octokit(),
        owner: 'test-owner',
        repo: 'test-repo',
        pullNumber: 1,
      });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error).toBe('PR has no description');
      }
    });
  });

  describe('retryAllFlaggedTasks', () => {
    it('should retry all flagged tasks', async () => {
      const installationId = 1234;
      const owner = 'test-owner';
      const repo = 'test-repo';
      const pullNumber = 1;
      const taskId = 'task-1';

      mockFindMany.mockResolvedValue([
        {
          id: taskId,
          installationId,
          owner,
          repo,
          pullNumber,
          flaggedForRetry: true,
          retryCount: 0,
        },
      ]);
      mockSwapLabels.mockResolvedValue({isSuccess: true});
      mockUpdate.mockResolvedValue({isSuccess: true});

      await jules.retryAllFlaggedTasks();

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {flaggedForRetry: true},
      });

      expect(mockSwapLabels).toHaveBeenCalledWith({
        installationId,
        owner,
        repo,
        issue_number: pullNumber,
        labelsToAdd: [mockConfig.jules.labels.highPrio],
        labelsToRemove: [],
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: {id: taskId},
        data: {
          flaggedForRetry: false,
          retryCount: 1,
        },
      });
    });
  });
});
