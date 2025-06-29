import { githubClient } from "@/lib/github";
import { db } from "@/server/db";

/**
 * Jules bot username patterns to look for
 */
const JULES_BOT_USERNAMES = [
  "google-labs-jules[bot]",
  "google-labs-jules",
  "jules[bot]",
  "jules-bot",
];

/**
 * Comment patterns that indicate Jules has hit task limits
 */
const TASK_LIMIT_PATTERNS = [
  "You are currently at your concurrent task limit",
  "concurrent task limit",
  "task limit reached",
  "too many tasks",
];

/**
 * Comment patterns that indicate Jules has started working
 */
const WORKING_PATTERNS = [
  "When finished, you will see another comment",
  "I'll get started on this",
  "Working on this now",
  "Starting work on",
];

/**
 * Type for GitHub issue data from webhooks
 */
interface GitHubIssueData {
  repository?: {
    full_name?: string;
  };
}

/**
 * Type for GitHub comment data - matches GitHub API response
 */
interface GitHubComment {
  id: number;
  body?: string;
  user?: {
    login: string;
    [key: string]: unknown;
  } | null;
  created_at: string;
  [key: string]: unknown;
}

/**
 * Detect if a comment indicates Jules has hit task limits
 */
export function isTaskLimitComment(commentBody: string): boolean {
  const body = commentBody.toLowerCase();
  return TASK_LIMIT_PATTERNS.some((pattern) =>
    body.includes(pattern.toLowerCase())
  );
}

/**
 * Detect if a comment indicates Jules is working
 */
export function isWorkingComment(commentBody: string): boolean {
  const body = commentBody.toLowerCase();
  return WORKING_PATTERNS.some((pattern) =>
    body.includes(pattern.toLowerCase())
  );
}

/**
 * Check if a username is a Jules bot
 */
export function isJulesBot(username: string): boolean {
  const lowerUsername = username.toLowerCase();
  return JULES_BOT_USERNAMES.some((botName) =>
    lowerUsername.includes(botName.toLowerCase().replace("[bot]", ""))
  );
}

/**
 * Parse repository information from GitHub issue data
 */
export function parseRepoFromIssue(
  issueData: GitHubIssueData
): { owner: string; repo: string } | null {
  if (!issueData?.repository?.full_name) {
    return null;
  }

  const [owner, repo] = issueData.repository.full_name.split("/");
  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
}

/**
 * Create or update a Jules task in the database
 */
export async function upsertJulesTask(params: {
  githubRepoId: bigint;
  githubIssueId: bigint;
  githubIssueNumber: bigint;
  repoOwner: string;
  repoName: string;
}) {
  const {
    githubRepoId,
    githubIssueId,
    githubIssueNumber,
    repoOwner,
    repoName,
  } = params;

  // Try to find existing task
  const existingTask = await db.julesTask.findUnique({
    where: { githubIssueId },
  });

  if (existingTask) {
    // Update existing task
    return await db.julesTask.update({
      where: { githubIssueId },
      data: {
        githubRepoId,
        githubIssueNumber,
        repoOwner,
        repoName,
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new task
    return await db.julesTask.create({
      data: {
        githubRepoId,
        githubIssueId,
        githubIssueNumber,
        repoOwner,
        repoName,
        flaggedForRetry: false,
        retryCount: 0,
      },
    });
  }
}

/**
 * Check Jules bot comments on an issue and determine next action
 */
export async function checkJulesComments(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<{
  action: "task_limit" | "working" | "no_action";
  comment?: GitHubComment;
}> {
  try {
    // Get all comments on the issue
    const comments = await githubClient.getIssueComments(
      owner,
      repo,
      issueNumber
    );

    // Filter for Jules bot comments (most recent first)
    const julesComments = comments
      .filter((comment) => comment.user && isJulesBot(comment.user.login))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    if (julesComments.length === 0) {
      return { action: "no_action" };
    }

    // Check the most recent Jules comment
    const latestComment = julesComments[0] as GitHubComment;
    const commentBody = latestComment?.body || "";

    if (isTaskLimitComment(commentBody)) {
      return {
        action: "task_limit",
        comment: latestComment,
      };
    }

    if (isWorkingComment(commentBody)) {
      return {
        action: "working",
        comment: latestComment,
      };
    }

    return { action: "no_action" };
  } catch (error) {
    console.error(
      `Failed to check Jules comments for ${owner}/${repo}#${issueNumber}:`,
      error
    );
    return { action: "no_action" };
  }
}

/**
 * Handle task limit scenario - queue the task for retry
 */
export async function handleTaskLimit(
  owner: string,
  repo: string,
  issueNumber: number,
  taskId: number
): Promise<void> {
  try {
    // Update task in database to be flagged for retry
    await db.julesTask.update({
      where: { id: taskId },
      data: {
        flaggedForRetry: true,
        updatedAt: new Date(),
      },
    });

    // Swap labels: remove 'jules', add 'jules-queue'
    await githubClient.swapLabels(
      owner,
      repo,
      issueNumber,
      "jules",
      "jules-queue"
    );

    console.log(`Queued task for retry: ${owner}/${repo}#${issueNumber}`);
  } catch (error) {
    console.error(
      `Failed to handle task limit for ${owner}/${repo}#${issueNumber}:`,
      error
    );
    throw error;
  }
}

/**
 * Handle working scenario - Jules is actively working
 */
export async function handleWorking(
  owner: string,
  repo: string,
  issueNumber: number,
  taskId: number
): Promise<void> {
  try {
    // Update task in database to not be flagged for retry
    await db.julesTask.update({
      where: { id: taskId },
      data: {
        flaggedForRetry: false,
        updatedAt: new Date(),
      },
    });

    console.log(`Jules is working on: ${owner}/${repo}#${issueNumber}`);
  } catch (error) {
    console.error(
      `Failed to handle working status for ${owner}/${repo}#${issueNumber}:`,
      error
    );
    throw error;
  }
}

/**
 * Process retry for a flagged task (enhanced with stored repo info)
 */
export async function processTaskRetry(taskId: number): Promise<boolean> {
  try {
    const task = await db.julesTask.findUnique({
      where: { id: taskId },
    });

    if (!task || !task.flaggedForRetry) {
      console.log(`Task ${taskId} not found or not flagged for retry`);
      return false;
    }

    const { repoOwner, repoName, githubIssueNumber } = task;
    const issueNumber = Number(githubIssueNumber);

    console.log(
      `Processing retry for task ${taskId}: ${repoOwner}/${repoName}#${issueNumber}`
    );

    // Check if issue still has 'Human' label - if so, skip
    const issue = await githubClient.getIssue(repoOwner, repoName, issueNumber);
    const hasHumanLabel =
      issue.labels?.some(
        (label) =>
          (typeof label === "string" ? label : label.name)?.toLowerCase() ===
          "human"
      ) ?? false;

    if (hasHumanLabel) {
      console.log(`Task ${taskId} has 'Human' label, skipping retry`);
      return false;
    }

    // Swap labels: remove 'jules-queue', add 'jules'
    await githubClient.swapLabels(
      repoOwner,
      repoName,
      issueNumber,
      "jules-queue",
      "jules"
    );

    // Update retry metrics
    await db.julesTask.update({
      where: { id: taskId },
      data: {
        flaggedForRetry: false,
        retryCount: task.retryCount + 1,
        lastRetryAt: new Date(),
      },
    });

    console.log(
      `Successfully retried task ${taskId}: ${repoOwner}/${repoName}#${issueNumber}`
    );
    return true;
  } catch (error) {
    console.error(`Failed to process retry for task ${taskId}:`, error);
    return false;
  }
}

/**
 * Get all tasks flagged for retry
 */
export async function getFlaggedTasks() {
  return await db.julesTask.findMany({
    where: { flaggedForRetry: true },
    orderBy: { createdAt: "asc" }, // Process oldest first
  });
}

/**
 * Bulk retry all flagged tasks
 */
export async function retryAllFlaggedTasks(): Promise<{
  attempted: number;
  successful: number;
  failed: number;
  skipped: number;
}> {
  const flaggedTasks = await getFlaggedTasks();
  const stats = {
    attempted: flaggedTasks.length,
    successful: 0,
    failed: 0,
    skipped: 0,
  };

  for (const task of flaggedTasks) {
    try {
      const success = await processTaskRetry(task.id);
      if (success) {
        stats.successful++;
      } else {
        stats.skipped++;
      }
    } catch (error) {
      console.error(`Failed to retry task ${task.id}:`, error);
      stats.failed++;
    }
  }

  console.log(`Retry batch complete:`, stats);
  return stats;
}

/**
 * Clean up old completed tasks (housekeeping)
 */
export async function cleanupOldTasks(
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db.julesTask.deleteMany({
    where: {
      flaggedForRetry: false,
      updatedAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(
    `Cleaned up ${result.count} old tasks older than ${olderThanDays} days`
  );
  return result.count;
}

/**
 * Get task statistics for monitoring
 */
export async function getTaskStats() {
  const [totalTasks, queuedTasks, activeTasks, oldestQueuedTask, retryStats] =
    await Promise.all([
      db.julesTask.count(),
      db.julesTask.count({ where: { flaggedForRetry: true } }),
      db.julesTask.count({
        where: {
          flaggedForRetry: false,
          updatedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // last hour
          },
        },
      }),
      db.julesTask.findFirst({
        where: { flaggedForRetry: true },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      db.julesTask.aggregate({
        where: { flaggedForRetry: true },
        _avg: { retryCount: true },
        _max: { retryCount: true },
      }),
    ]);

  return {
    totalTasks,
    queuedTasks,
    activeTasks,
    oldestQueuedTaskAge: oldestQueuedTask
      ? Date.now() - oldestQueuedTask.createdAt.getTime()
      : null,
    averageRetryCount: retryStats._avg.retryCount || 0,
    maxRetryCount: retryStats._max.retryCount || 0,
  };
}
