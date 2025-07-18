import { upsertJulesTask } from '../src/lib/jules.js';

async function main() {
  await upsertJulesTask({
    githubRepoId: '123',
    githubIssueId: '456',
    githubIssueNumber: 789,
    repoOwner: 'test-owner',
    repoName: 'test-repo',
    installationId: '1',
  });
}

main();
