import { getJulesNextAction, processTaskRetry } from './jules';
import { db } from '../server/db';
import { githubClient } from './github';

jest.mock('../server/db', () => ({
  db: {
    julesTask: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('./github', () => ({
  githubClient: {
    swapLabels: jest.fn(),
    getIssue: jest.fn(),
  },
}));

describe('getJulesNextAction', () => {
  it('should return "label" when no labels are present', () => {
    const issue = { labels: [] };
    const result = getJulesNextAction(issue);
    expect(result.action).toBe('label');
  });
});

describe('processTaskRetry', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return false and not update the task if swapping labels fails', async () => {
    const taskId = 1;
    const task = {
      id: taskId,
      flaggedForRetry: true,
      repoOwner: 'test-owner',
      repoName: 'test-repo',
      githubIssueNumber: 123,
      retryCount: 0,
    };

    (db.julesTask.findUnique as jest.Mock).mockResolvedValue(task);
    (githubClient.getIssue as jest.Mock).mockResolvedValue({ labels: [] });
    (githubClient.swapLabels as jest.Mock).mockRejectedValue(new Error('Failed to swap labels'));

    const result = await processTaskRetry(taskId);

    expect(result).toBe(false);
    expect(db.julesTask.update).not.toHaveBeenCalled();
  });
});
