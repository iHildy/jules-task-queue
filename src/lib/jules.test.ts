import { vi } from 'vitest';
import { db } from '../server/db';
import { githubClient } from './github';
import { checkJulesComments, handleTaskLimit, retryAllFlaggedTasks } from './jules';
import { JulesTask, Repository, Installation } from '@prisma/client';

vi.mock('../server/db', () => ({
  db: {
    user: {
      findFirst: vi.fn(),
    },
    repository: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    installation: {
      findFirst: vi.fn(),
    },
    julesTask: {
      findMany: vi.fn(),
      update: vi.fn(),
    }
  },
}));

vi.mock('./github', () => ({
  githubClient: {
    getRepoInfo: vi.fn(),
    createInstallationAccessToken: vi.fn(),
    getAuthenticatedApp: vi.fn(),
    getInstallationRepos: vi.fn(),
    getIssueComments: vi.fn(),
    swapLabels: vi.fn(),
  },
}));

describe('jules', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should simulate the full queueing and retry workflow', async () => {
    // 1. Set up mock data
    const mockTask: JulesTask = {
      id: 1,
      githubIssueId: 123,
      repositoryId: 456,
      installationId: 789,
      status: 'in_progress',
      retryAt: null,
      flaggedForRetry: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepo: Repository = {
      id: 456,
      name: 'test-repo',
      owner: 'test-owner',
      installationId: 789,
    };

    const mockInstallation: Installation = {
      id: 789,
      githubInstallationId: 987,
      suspended: false,
    };

    const mockIssueComment = {
      id: 1,
      body: 'Jules is over capacity right now and will retry this task later. (ref: jules_task_limit)',
      user: {
        login: 'jules-app[bot]'
      }
    };

    // 2. Mock the return values of `githubClient.getIssueComments`
    vi.spyOn(githubClient, 'getIssueComments').mockResolvedValue([mockIssueComment]);
    vi.spyOn(db.repository, 'findFirst').mockResolvedValue(mockRepo);
    vi.spyOn(db.installation, 'findFirst').mockResolvedValue(mockInstallation);

    // 3. Call `checkJulesComments` and assert that it returns a `task_limit` action
    const action = await checkJulesComments(mockTask.installationId, mockRepo.owner, mockRepo.name, mockTask.githubIssueId);
    expect(action).toBe('task_limit');

    // 4. Call `handleTaskLimit` and assert the database is updated and labels are swapped
    await handleTaskLimit(mockTask, mockRepo, mockInstallation.githubInstallationId);
    expect(db.julesTask.update).toHaveBeenCalledWith({
      where: { id: mockTask.id },
      data: { flaggedForRetry: true },
    });
    expect(githubClient.swapLabels).toHaveBeenCalledWith(
      mockInstallation.githubInstallationId,
      mockRepo.owner,
      mockRepo.name,
      mockTask.githubIssueId,
      'jules_in_progress',
      'jules_queued'
    );

    // 5. Mock the return value of `db.julesTask.findMany`
    const flaggedTask = { ...mockTask, flaggedForRetry: true };
    vi.spyOn(db.julesTask, 'findMany').mockResolvedValue([flaggedTask]);
    vi.spyOn(db.repository, 'findFirst').mockResolvedValue(mockRepo);
    vi.spyOn(db.installation, 'findFirst').mockResolvedValue(mockInstallation);

    // 6. Call `retryAllFlaggedTasks` and assert the labels are swapped back and the task is updated
    await retryAllFlaggedTasks();
    expect(githubClient.swapLabels).toHaveBeenCalledWith(
      mockInstallation.githubInstallationId,
      mockRepo.owner,
      mockRepo.name,
      mockTask.githubIssueId,
      'jules_queued',
      'jules_in_progress'
    );
    expect(db.julesTask.update).toHaveBeenCalledWith({
      where: { id: flaggedTask.id },
      data: { flaggedForRetry: false },
    });
  });
});
